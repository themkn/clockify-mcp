import { z } from "zod";
import type { ToolDefinition } from "../server.js";

const Empty = z.object({}).strict();

export const metaTools: ToolDefinition<unknown>[] = [
  {
    name: "get_current_user",
    description:
      "Return the Clockify user this server is acting as (resolved from the configured API key at startup).",
    schema: Empty,
    handler: async (_input, ctx) => ({
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
    }),
  },
  {
    name: "get_workspace",
    description: "Return the workspace id this server operates against.",
    schema: Empty,
    handler: async (_input, ctx) => ({ workspaceId: ctx.config.workspaceId }),
  },
];
