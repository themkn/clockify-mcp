import { z } from "zod";
import type { ToolContext, ToolDefinition } from "../server.js";
import { shapeTag } from "./shape.js";
import { zBoolean, zPositiveInt } from "./coerce.js";
import type { CreateTagBody, RawTag, UpdateTagBody } from "../clockify/types.js";

const idString = z.string().min(1).refine((s) => !s.includes("/"), "must not contain '/'");

const ListInput = z
  .object({
    name: z.string().min(1).optional(),
    archived: zBoolean().optional(),
    page: zPositiveInt().optional(),
    pageSize: zPositiveInt(200).optional(),
  })
  .strict();

const CreateInput = z.object({ name: z.string().min(1) }).strict();
const UpdateInput = z.object({ id: idString, name: z.string().min(1).optional(), archived: zBoolean().optional() }).strict();
const DeleteInput = z.object({ id: idString }).strict();

type AnyClient = {
  listTags: (ws: string, q: unknown) => Promise<RawTag[]>;
  createTag: (ws: string, body: CreateTagBody) => Promise<RawTag>;
  updateTag: (ws: string, id: string, body: UpdateTagBody) => Promise<RawTag>;
  deleteTag: (ws: string, id: string) => Promise<void>;
};
const c = (ctx: ToolContext) => ctx.client as unknown as AnyClient;

export const tagTools: ToolDefinition<unknown>[] = [
  {
    name: "list_tags",
    description: "List tags in the workspace. Filter by name or archived state.",
    schema: ListInput,
    handler: async (input, ctx) => {
      const i = input as z.infer<typeof ListInput>;
      const raw = await c(ctx).listTags(ctx.config.workspaceId, i);
      return raw.map(shapeTag);
    },
  },
  {
    name: "create_tag",
    description: "Create a tag.",
    schema: CreateInput,
    handler: async (input, ctx) =>
      shapeTag(await c(ctx).createTag(ctx.config.workspaceId, input as CreateTagBody)),
  },
  {
    name: "update_tag",
    description: "Rename or archive a tag.",
    schema: UpdateInput,
    handler: async (input, ctx) => {
      const { id, ...rest } = input as z.infer<typeof UpdateInput>;
      return shapeTag(await c(ctx).updateTag(ctx.config.workspaceId, id, rest));
    },
  },
  {
    name: "delete_tag",
    description: "Delete a tag.",
    schema: DeleteInput,
    handler: async (input, ctx) => {
      const { id } = input as z.infer<typeof DeleteInput>;
      await c(ctx).deleteTag(ctx.config.workspaceId, id);
      return { deleted: true, id };
    },
  },
];
