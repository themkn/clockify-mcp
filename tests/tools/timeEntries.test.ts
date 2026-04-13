import { describe, it, expect } from "vitest";
import { timeEntryTools } from "../../src/tools/timeEntries.js";
import { makeContext } from "../helpers/mockClient.js";

function findTool(name: string) {
  const t = timeEntryTools.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return t;
}

describe("time entry tools", () => {
  it("list_time_entries shapes and forwards filters", async () => {
    const ctx = makeContext();
    (ctx.client as any).listTimeEntries = (ws: string, u: string, q: unknown) => {
      expect(ws).toBe("WS");
      expect(u).toBe("U1");
      expect(q).toEqual({
        start: "2026-04-01T00:00:00Z",
        end: "2026-04-02T00:00:00Z",
        project: "P1",
        description: "foo",
        page: 1,
        pageSize: 20,
      });
      return Promise.resolve([
        {
          id: "E1",
          description: "d",
          timeInterval: { start: "2026-04-01T09:00:00Z", end: "2026-04-01T10:00:00Z" },
          project: { id: "P1", name: "Proj" },
          tagIds: ["T1"],
          billable: true,
        },
      ]);
    };
    const result = await findTool("list_time_entries").handler(
      {
        start: "2026-04-01T00:00:00Z",
        end: "2026-04-02T00:00:00Z",
        projectId: "P1",
        descriptionContains: "foo",
        page: 1,
        pageSize: 20,
      },
      ctx,
    );
    expect(result).toEqual([
      {
        id: "E1",
        description: "d",
        start: "2026-04-01T09:00:00Z",
        end: "2026-04-01T10:00:00Z",
        durationSeconds: 3600,
        projectId: "P1",
        projectName: "Proj",
        taskId: null,
        tagIds: ["T1"],
        billable: true,
      },
    ]);
  });

  it("create_time_entry forwards body and shapes response", async () => {
    const ctx = makeContext();
    (ctx.client as any).createTimeEntry = (ws: string, body: unknown) => {
      expect(ws).toBe("WS");
      expect(body).toEqual({
        start: "2026-04-01T09:00:00Z",
        end: "2026-04-01T10:00:00Z",
        description: "d",
        projectId: "P1",
        tagIds: ["T1"],
        billable: true,
      });
      return Promise.resolve({ id: "E1", description: "d", timeInterval: { start: "2026-04-01T09:00:00Z", end: "2026-04-01T10:00:00Z" }, project: { id: "P1", name: "Proj" }, tagIds: ["T1"], billable: true });
    };
    const res = await findTool("create_time_entry").handler(
      {
        start: "2026-04-01T09:00:00Z",
        end: "2026-04-01T10:00:00Z",
        description: "d",
        projectId: "P1",
        tagIds: ["T1"],
        billable: true,
      },
      ctx,
    );
    expect((res as any).id).toBe("E1");
  });

  it("start_timer rejects if a timer is already running", async () => {
    const ctx = makeContext();
    (ctx.client as any).listTimeEntries = () => Promise.resolve([{ id: "running", timeInterval: { start: "now", end: null } }]);
    await expect(
      findTool("start_timer").handler({ description: "x" }, ctx),
    ).rejects.toThrow(/already running/i);
  });

  it("start_timer creates an open entry when none is running", async () => {
    const ctx = makeContext();
    (ctx.client as any).listTimeEntries = () => Promise.resolve([]);
    (ctx.client as any).createTimeEntry = (_ws: string, body: any) => {
      expect(body.end).toBeUndefined();
      expect(body.description).toBe("hack");
      return Promise.resolve({ id: "E2", description: "hack", timeInterval: { start: "now", end: null }, project: null });
    };
    const res = await findTool("start_timer").handler({ description: "hack" }, ctx);
    expect((res as any).id).toBe("E2");
  });

  it("stop_timer uses now when end omitted", async () => {
    const ctx = makeContext();
    const received: string[] = [];
    (ctx.client as any).stopRunningTimer = (_ws: string, _u: string, end: string) => {
      received.push(end);
      return Promise.resolve({ id: "E1", timeInterval: { start: "s", end } });
    };
    const res = await findTool("stop_timer").handler({}, ctx);
    expect(received[0]).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect((res as any).end).toBe(received[0]);
  });

  it("get_running_timer returns null when none", async () => {
    const ctx = makeContext();
    (ctx.client as any).listTimeEntries = () => Promise.resolve([]);
    const res = await findTool("get_running_timer").handler({}, ctx);
    expect(res).toBeNull();
  });
});
