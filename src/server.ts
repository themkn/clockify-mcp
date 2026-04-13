import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z, type ZodTypeAny } from "zod";
import { ClockifyClient } from "./clockify/client.js";
import { ClockifyError } from "./clockify/errors.js";
import type { Config } from "./config.js";
import type { ClockifyUser } from "./clockify/types.js";

export interface ToolDefinition<Input> {
  name: string;
  description: string;
  schema: ZodTypeAny;
  handler: (input: Input, ctx: ToolContext) => Promise<unknown>;
}

export interface ToolContext {
  client: ClockifyClient;
  config: Config;
  user: ClockifyUser;
}

export interface ServerBootstrap {
  config: Config;
  user: ClockifyUser;
  client: ClockifyClient;
  tools: ToolDefinition<unknown>[];
}

export function buildServer(bootstrap: ServerBootstrap): Server {
  const { config, user, client, tools } = bootstrap;
  const byName = new Map(tools.map((t) => [t.name, t]));
  const ctx: ToolContext = { client, config, user };

  const mcp = new Server(
    { name: "clockify-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map<Tool>((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: toInputSchema(t.schema),
    })),
  }));

  mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = byName.get(req.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
      };
    }
    const parsed = tool.schema.safeParse(req.params.arguments ?? {});
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return {
        isError: true,
        content: [{ type: "text", text: `Invalid input: ${msg}` }],
      };
    }
    try {
      const result = await tool.handler(parsed.data, ctx);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const text =
        err instanceof ClockifyError
          ? err.toUserMessage()
          : `Unexpected error: ${(err as Error).message}`;
      return { isError: true, content: [{ type: "text", text }] };
    }
  });

  return mcp;
}

export async function runServer(bootstrap: ServerBootstrap): Promise<void> {
  const server = buildServer(bootstrap);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/**
 * Project a zod schema to the JSON-Schema shape the MCP SDK expects for
 * `Tool.inputSchema`. Delegates to zod 4's built-in `z.toJSONSchema`, then
 * casts to the MCP SDK's narrower type (MCP requires `type: "object"` at the
 * top level; our tool schemas always start with `z.object(...)`).
 */
function toInputSchema(schema: ZodTypeAny): Tool["inputSchema"] {
  return z.toJSONSchema(schema, { target: "draft-7" }) as Tool["inputSchema"];
}
