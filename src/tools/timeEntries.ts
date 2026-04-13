import { z } from "zod";
import type { ToolContext, ToolDefinition } from "../server.js";
import { shapeTimeEntry } from "./shape.js";
import { zBoolean, zPositiveInt } from "./coerce.js";
import type {
  CreateTimeEntryBody,
  RawTimeEntry,
  UpdateTimeEntryBody,
} from "../clockify/types.js";

const idString = z.string().min(1).refine((s) => !s.includes("/"), "must not contain '/'");
const isoDateTime = z.string().min(1).describe("ISO 8601 timestamp (e.g. 2026-04-12T09:00:00Z)");

const ListInput = z
  .object({
    start: isoDateTime.optional(),
    end: isoDateTime.optional(),
    projectId: idString.optional(),
    descriptionContains: z.string().min(1).optional(),
    page: zPositiveInt().optional(),
    pageSize: zPositiveInt(200).optional(),
  })
  .strict();

const GetInput = z.object({ id: idString }).strict();

const CreateInput = z
  .object({
    start: isoDateTime,
    end: isoDateTime.optional(),
    description: z.string().optional(),
    projectId: idString.optional(),
    taskId: idString.optional(),
    tagIds: z.array(idString).optional(),
    billable: zBoolean().optional(),
  })
  .strict();

const UpdateInput = z
  .object({
    id: idString,
    start: isoDateTime.optional(),
    end: isoDateTime.optional(),
    description: z.string().optional(),
    projectId: idString.optional(),
    taskId: idString.optional(),
    tagIds: z.array(idString).optional(),
    billable: zBoolean().optional(),
  })
  .strict();

const DeleteInput = z.object({ id: idString }).strict();

const StartInput = z
  .object({
    description: z.string().optional(),
    projectId: idString.optional(),
    taskId: idString.optional(),
    tagIds: z.array(idString).optional(),
    billable: zBoolean().optional(),
    start: isoDateTime.optional(),
  })
  .strict();

const StopInput = z.object({ end: isoDateTime.optional() }).strict();
const Empty = z.object({}).strict();

type AnyClient = {
  listTimeEntries: (ws: string, user: string, q: unknown) => Promise<RawTimeEntry[]>;
  getTimeEntry: (ws: string, id: string) => Promise<RawTimeEntry>;
  createTimeEntry: (ws: string, body: CreateTimeEntryBody) => Promise<RawTimeEntry>;
  updateTimeEntry: (ws: string, id: string, body: UpdateTimeEntryBody) => Promise<RawTimeEntry>;
  deleteTimeEntry: (ws: string, id: string) => Promise<void>;
  stopRunningTimer: (ws: string, user: string, end: string) => Promise<RawTimeEntry>;
};

function c(ctx: ToolContext): AnyClient {
  return ctx.client as unknown as AnyClient;
}

async function findRunning(ctx: ToolContext): Promise<RawTimeEntry | null> {
  const items = await c(ctx).listTimeEntries(ctx.config.workspaceId, ctx.user.id, {
    inProgress: true,
  });
  return items[0] ?? null;
}

export const timeEntryTools: ToolDefinition<unknown>[] = [
  {
    name: "list_time_entries",
    description:
      "List the current user's time entries. Filter by ISO start/end window, projectId, or a substring of description. Returns compact objects: id, description, start, end, durationSeconds, projectId, projectName, taskId, tagIds, billable.",
    schema: ListInput,
    handler: async (input, ctx) => {
      const i = input as z.infer<typeof ListInput>;
      const raw = await c(ctx).listTimeEntries(ctx.config.workspaceId, ctx.user.id, {
        start: i.start,
        end: i.end,
        project: i.projectId,
        description: i.descriptionContains,
        page: i.page,
        pageSize: i.pageSize,
      });
      return raw.map(shapeTimeEntry);
    },
  },
  {
    name: "get_time_entry",
    description: "Fetch a single time entry by id.",
    schema: GetInput,
    handler: async (input, ctx) => {
      const { id } = input as z.infer<typeof GetInput>;
      const raw = await c(ctx).getTimeEntry(ctx.config.workspaceId, id);
      return shapeTimeEntry(raw);
    },
  },
  {
    name: "create_time_entry",
    description:
      "Create a completed time entry. Requires ISO start; provide end to make it closed (recommended for logging past work).",
    schema: CreateInput,
    handler: async (input, ctx) => {
      const body = input as CreateTimeEntryBody;
      const raw = await c(ctx).createTimeEntry(ctx.config.workspaceId, body);
      return shapeTimeEntry(raw);
    },
  },
  {
    name: "update_time_entry",
    description: "Patch an existing time entry. Any field omitted is left unchanged.",
    schema: UpdateInput,
    handler: async (input, ctx) => {
      const { id, ...rest } = input as z.infer<typeof UpdateInput>;
      const raw = await c(ctx).updateTimeEntry(ctx.config.workspaceId, id, rest);
      return shapeTimeEntry(raw);
    },
  },
  {
    name: "delete_time_entry",
    description: "Delete a time entry by id.",
    schema: DeleteInput,
    handler: async (input, ctx) => {
      const { id } = input as z.infer<typeof DeleteInput>;
      await c(ctx).deleteTimeEntry(ctx.config.workspaceId, id);
      return { deleted: true, id };
    },
  },
  {
    name: "start_timer",
    description:
      "Start a running time entry. Fails with an error if another timer is already running — stop it first.",
    schema: StartInput,
    handler: async (input, ctx) => {
      const i = input as z.infer<typeof StartInput>;
      const running = await findRunning(ctx);
      if (running) {
        throw new Error(`A timer is already running (id ${running.id}). Stop it before starting a new one.`);
      }
      const raw = await c(ctx).createTimeEntry(ctx.config.workspaceId, {
        start: i.start ?? new Date().toISOString(),
        description: i.description,
        projectId: i.projectId,
        taskId: i.taskId,
        tagIds: i.tagIds,
        billable: i.billable,
      });
      return shapeTimeEntry(raw);
    },
  },
  {
    name: "stop_timer",
    description: "Stop the currently running timer. Uses now as the end time if `end` is omitted.",
    schema: StopInput,
    handler: async (input, ctx) => {
      const { end } = input as z.infer<typeof StopInput>;
      const raw = await c(ctx).stopRunningTimer(
        ctx.config.workspaceId,
        ctx.user.id,
        end ?? new Date().toISOString(),
      );
      return shapeTimeEntry(raw);
    },
  },
  {
    name: "get_running_timer",
    description: "Return the currently running time entry, or null if none.",
    schema: Empty,
    handler: async (_input, ctx) => {
      const running = await findRunning(ctx);
      return running ? shapeTimeEntry(running) : null;
    },
  },
];
