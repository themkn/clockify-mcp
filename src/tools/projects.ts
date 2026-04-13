import { z } from "zod";
import type { ToolContext, ToolDefinition } from "../server.js";
import { ClockifyError } from "../clockify/errors.js";
import { shapeProject } from "./shape.js";
import { zBoolean, zPositiveInt } from "./coerce.js";
import type { CreateProjectBody, RawProject, UpdateProjectBody } from "../clockify/types.js";

const idString = z.string().min(1).refine((s) => !s.includes("/"), "must not contain '/'");

const ListInput = z
  .object({
    name: z.string().min(1).optional(),
    clientId: idString.optional(),
    archived: zBoolean().optional(),
    page: zPositiveInt().optional(),
    pageSize: zPositiveInt(200).optional(),
  })
  .strict();

const GetInput = z.object({ id: idString }).strict();

const CreateInput = z
  .object({
    name: z.string().min(1),
    clientId: idString.optional(),
    color: z.string().min(1).optional(),
    billable: zBoolean().optional(),
    note: z.string().optional(),
  })
  .strict();

const UpdateInput = z
  .object({
    id: idString,
    name: z.string().min(1).optional(),
    clientId: idString.optional(),
    color: z.string().min(1).optional(),
    billable: zBoolean().optional(),
    note: z.string().optional(),
  })
  .strict();

const DeleteInput = z.object({ id: idString }).strict();

type AnyClient = {
  listProjects: (ws: string, q: unknown) => Promise<RawProject[]>;
  getProject: (ws: string, id: string) => Promise<RawProject>;
  createProject: (ws: string, body: CreateProjectBody) => Promise<RawProject>;
  updateProject: (ws: string, id: string, body: UpdateProjectBody) => Promise<RawProject>;
  deleteProject: (ws: string, id: string) => Promise<void>;
  archiveProject: (ws: string, id: string) => Promise<RawProject>;
};
const c = (ctx: ToolContext) => ctx.client as unknown as AnyClient;

export const projectTools: ToolDefinition<unknown>[] = [
  {
    name: "list_projects",
    description: "List projects in the workspace. Filter by name substring, clientId, or archived state.",
    schema: ListInput,
    handler: async (input, ctx) => {
      const i = input as z.infer<typeof ListInput>;
      const raw = await c(ctx).listProjects(ctx.config.workspaceId, {
        name: i.name,
        clientIds: i.clientId ? [i.clientId] : undefined,
        archived: i.archived,
        page: i.page,
        pageSize: i.pageSize,
      });
      return raw.map(shapeProject);
    },
  },
  {
    name: "get_project",
    description: "Fetch a project by id.",
    schema: GetInput,
    handler: async (input, ctx) => {
      const { id } = input as z.infer<typeof GetInput>;
      return shapeProject(await c(ctx).getProject(ctx.config.workspaceId, id));
    },
  },
  {
    name: "create_project",
    description: "Create a project.",
    schema: CreateInput,
    handler: async (input, ctx) => {
      const body = input as CreateProjectBody;
      return shapeProject(await c(ctx).createProject(ctx.config.workspaceId, body));
    },
  },
  {
    name: "update_project",
    description: "Patch a project. Any field omitted is left unchanged.",
    schema: UpdateInput,
    handler: async (input, ctx) => {
      const { id, ...rest } = input as z.infer<typeof UpdateInput>;
      return shapeProject(await c(ctx).updateProject(ctx.config.workspaceId, id, rest));
    },
  },
  {
    name: "delete_project",
    description:
      "Attempt to delete a project. If Clockify refuses because the project has time entries, the project is archived instead. The response reports which action ran: { action: 'deleted' } or { action: 'archived' }.",
    schema: DeleteInput,
    handler: async (input, ctx) => {
      const { id } = input as z.infer<typeof DeleteInput>;
      try {
        await c(ctx).deleteProject(ctx.config.workspaceId, id);
        return { action: "deleted", id };
      } catch (err) {
        if (err instanceof ClockifyError && (err.status === 400 || err.status === 403 || err.status === 409)) {
          await c(ctx).archiveProject(ctx.config.workspaceId, id);
          return { action: "archived", id };
        }
        throw err;
      }
    },
  },
];
