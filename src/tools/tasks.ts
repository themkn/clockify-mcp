import { z } from "zod";
import type { ToolContext, ToolDefinition } from "../server.js";
import { shapeTask } from "./shape.js";
import type { CreateTaskBody, RawTask, UpdateTaskBody } from "../clockify/types.js";

const idString = z.string().min(1).refine((s) => !s.includes("/"), "must not contain '/'");

const ListInput = z
  .object({
    projectId: idString,
    name: z.string().min(1).optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(200).optional(),
  })
  .strict();

const CreateInput = z
  .object({
    projectId: idString,
    name: z.string().min(1),
    assigneeIds: z.array(idString).optional(),
    estimate: z.string().min(1).optional(),
    status: z.enum(["ACTIVE", "DONE"]).optional(),
  })
  .strict();

const UpdateInput = z
  .object({
    projectId: idString,
    id: idString,
    name: z.string().min(1).optional(),
    assigneeIds: z.array(idString).optional(),
    estimate: z.string().min(1).optional(),
    status: z.enum(["ACTIVE", "DONE"]).optional(),
  })
  .strict();

const DeleteInput = z.object({ projectId: idString, id: idString }).strict();

type AnyClient = {
  listTasks: (ws: string, pid: string, q: unknown) => Promise<RawTask[]>;
  createTask: (ws: string, pid: string, body: CreateTaskBody) => Promise<RawTask>;
  updateTask: (ws: string, pid: string, id: string, body: UpdateTaskBody) => Promise<RawTask>;
  deleteTask: (ws: string, pid: string, id: string) => Promise<void>;
};
const c = (ctx: ToolContext) => ctx.client as unknown as AnyClient;

export const taskTools: ToolDefinition<unknown>[] = [
  {
    name: "list_tasks",
    description: "List tasks belonging to a project.",
    schema: ListInput,
    handler: async (input, ctx) => {
      const i = input as z.infer<typeof ListInput>;
      const raw = await c(ctx).listTasks(ctx.config.workspaceId, i.projectId, {
        name: i.name,
        page: i.page,
        pageSize: i.pageSize,
      });
      return raw.map(shapeTask);
    },
  },
  {
    name: "create_task",
    description: "Create a task under a project.",
    schema: CreateInput,
    handler: async (input, ctx) => {
      const { projectId, ...body } = input as z.infer<typeof CreateInput>;
      return shapeTask(await c(ctx).createTask(ctx.config.workspaceId, projectId, body));
    },
  },
  {
    name: "update_task",
    description: "Patch a task. Any field omitted is left unchanged.",
    schema: UpdateInput,
    handler: async (input, ctx) => {
      const { projectId, id, ...body } = input as z.infer<typeof UpdateInput>;
      return shapeTask(await c(ctx).updateTask(ctx.config.workspaceId, projectId, id, body));
    },
  },
  {
    name: "delete_task",
    description: "Delete a task.",
    schema: DeleteInput,
    handler: async (input, ctx) => {
      const { projectId, id } = input as z.infer<typeof DeleteInput>;
      await c(ctx).deleteTask(ctx.config.workspaceId, projectId, id);
      return { deleted: true, id };
    },
  },
];
