import { z } from "zod";
import type { ToolContext, ToolDefinition } from "../server.js";
import { shapeClient } from "./shape.js";
import type { CreateClientBody, RawClient, UpdateClientBody } from "../clockify/types.js";

const idString = z.string().min(1).refine((s) => !s.includes("/"), "must not contain '/'");

const ListInput = z
  .object({
    name: z.string().min(1).optional(),
    archived: z.boolean().optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(200).optional(),
  })
  .strict();

const CreateInput = z.object({ name: z.string().min(1), note: z.string().optional() }).strict();
const UpdateInput = z
  .object({
    id: idString,
    name: z.string().min(1).optional(),
    note: z.string().optional(),
    archived: z.boolean().optional(),
  })
  .strict();
const DeleteInput = z.object({ id: idString }).strict();

type AnyClient = {
  listClients: (ws: string, q: unknown) => Promise<RawClient[]>;
  createClient: (ws: string, body: CreateClientBody) => Promise<RawClient>;
  updateClient: (ws: string, id: string, body: UpdateClientBody) => Promise<RawClient>;
  deleteClient: (ws: string, id: string) => Promise<void>;
};
const c = (ctx: ToolContext) => ctx.client as unknown as AnyClient;

export const clientTools: ToolDefinition<unknown>[] = [
  {
    name: "list_clients",
    description: "List Clockify clients in the workspace.",
    schema: ListInput,
    handler: async (input, ctx) => {
      const raw = await c(ctx).listClients(ctx.config.workspaceId, input as never);
      return raw.map(shapeClient);
    },
  },
  {
    name: "create_client",
    description: "Create a Clockify client.",
    schema: CreateInput,
    handler: async (input, ctx) =>
      shapeClient(await c(ctx).createClient(ctx.config.workspaceId, input as CreateClientBody)),
  },
  {
    name: "update_client",
    description: "Patch a Clockify client. Any field omitted is left unchanged.",
    schema: UpdateInput,
    handler: async (input, ctx) => {
      const { id, ...rest } = input as z.infer<typeof UpdateInput>;
      return shapeClient(await c(ctx).updateClient(ctx.config.workspaceId, id, rest));
    },
  },
  {
    name: "delete_client",
    description: "Delete a Clockify client.",
    schema: DeleteInput,
    handler: async (input, ctx) => {
      const { id } = input as z.infer<typeof DeleteInput>;
      await c(ctx).deleteClient(ctx.config.workspaceId, id);
      return { deleted: true, id };
    },
  },
];
