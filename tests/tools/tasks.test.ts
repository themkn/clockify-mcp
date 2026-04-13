import { describe, it, expect } from "vitest";
import { taskTools } from "../../src/tools/tasks.js";
import { makeContext } from "../helpers/mockClient.js";

const find = (n: string) => {
  const t = taskTools.find((x) => x.name === n);
  if (!t) throw new Error(n);
  return t;
};

describe("task tools", () => {
  it("list_tasks shapes results", async () => {
    const ctx = makeContext();
    (ctx.client as any).listTasks = (ws: string, p: string) => {
      expect(ws).toBe("WS");
      expect(p).toBe("P1");
      return Promise.resolve([{ id: "T1", name: "Ship it", projectId: "P1", status: "ACTIVE", assigneeIds: [] }]);
    };
    const res = await find("list_tasks").handler({ projectId: "P1" }, ctx);
    expect(res).toEqual([
      { id: "T1", name: "Ship it", projectId: "P1", status: "ACTIVE", assigneeIds: [], estimate: null },
    ]);
  });

  it("create_task posts body", async () => {
    const ctx = makeContext();
    (ctx.client as any).createTask = (_ws: string, pid: string, body: any) => {
      expect(pid).toBe("P1");
      expect(body).toEqual({ name: "New" });
      return Promise.resolve({ id: "T2", name: "New", projectId: "P1" });
    };
    const res = await find("create_task").handler({ projectId: "P1", name: "New" }, ctx);
    expect((res as any).id).toBe("T2");
  });

  it("delete_task calls client", async () => {
    const ctx = makeContext();
    (ctx.client as any).deleteTask = () => Promise.resolve();
    const res = await find("delete_task").handler({ projectId: "P1", id: "T1" }, ctx);
    expect(res).toEqual({ deleted: true, id: "T1" });
  });
});
