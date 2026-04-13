import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import type { ZodTypeAny } from "zod";
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
      inputSchema: zodToJsonSchema(t.schema),
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

/** Minimal zod → JSON Schema projection for MCP tool discovery. */
interface InputSchema extends Record<string, unknown> {
  type: "object";
  properties?: Record<string, object>;
  required?: string[];
  additionalProperties?: boolean;
}

function zodToJsonSchema(schema: ZodTypeAny): InputSchema {
  const def = (schema as unknown as { _def: { typeName: string; shape?: () => Record<string, ZodTypeAny> } })._def;
  if (def.typeName === "ZodObject" && def.shape) {
    const shape = def.shape();
    const properties: Record<string, object> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodLeafToJsonSchema(value);
      if (!value.isOptional()) required.push(key);
    }
    return { type: "object", properties, required, additionalProperties: false };
  }
  // Fallback for schemas wrapped by .strict() or .refine() — unwrap one level.
  const inner = (schema as unknown as { _def: { schema?: ZodTypeAny; innerType?: ZodTypeAny } })._def;
  if (inner.schema) return zodToJsonSchema(inner.schema);
  if (inner.innerType) return zodToJsonSchema(inner.innerType);
  return { type: "object" };
}

function zodLeafToJsonSchema(schema: ZodTypeAny): object {
  const name = (schema as unknown as { _def: { typeName: string } })._def.typeName;
  switch (name) {
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodArray":
      return { type: "array", items: { type: "string" } };
    case "ZodEnum": {
      const values = (schema as unknown as { _def: { values: string[] } })._def.values;
      return { type: "string", enum: values };
    }
    case "ZodOptional":
    case "ZodDefault":
    case "ZodEffects":
      return zodLeafToJsonSchema((schema as unknown as { _def: { innerType?: ZodTypeAny; schema?: ZodTypeAny } })._def.innerType ?? (schema as unknown as { _def: { schema: ZodTypeAny } })._def.schema);
    default:
      return {};
  }
}
