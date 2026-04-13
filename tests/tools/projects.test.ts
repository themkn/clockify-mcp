import { describe, it, expect } from "vitest";
import { projectTools } from "../../src/tools/projects.js";
import { makeContext } from "../helpers/mockClient.js";
import { ClockifyError } from "../../src/clockify/errors.js";

function findTool(name: string) {
  const t = projectTools.find((x) => x.name === name);
  if (!t) throw new Error(name);
  return t;
}

describe("project tools", () => {
  it("list_projects shapes results", async () => {
    const ctx = makeContext();
    (ctx.client as any).listProjects = () => Promise.resolve([
      { id: "P1", name: "Acme", clientId: "C1", clientName: "Client", archived: false, billable: true, color: "#fff" },
    ]);
    const res = await findTool("list_projects").handler({}, ctx);
    expect(res).toEqual([
      { id: "P1", name: "Acme", clientId: "C1", clientName: "Client", archived: false, billable: true, color: "#fff" },
    ]);
  });

  it("create_project posts body", async () => {
    const ctx = makeContext();
    (ctx.client as any).createProject = (_ws: string, body: any) => {
      expect(body).toEqual({ name: "New", clientId: "C1", billable: true });
      return Promise.resolve({ id: "P2", name: "New", clientId: "C1", billable: true });
    };
    const res = await findTool("create_project").handler(
      { name: "New", clientId: "C1", billable: true },
      ctx,
    );
    expect((res as any).id).toBe("P2");
  });

  it("delete_project reports 'deleted' on success", async () => {
    const ctx = makeContext();
    (ctx.client as any).deleteProject = () => Promise.resolve();
    const res = await findTool("delete_project").handler({ id: "P1" }, ctx);
    expect(res).toEqual({ action: "deleted", id: "P1" });
  });

  it("delete_project falls back to archive if delete is forbidden", async () => {
    const ctx = makeContext();
    (ctx.client as any).deleteProject = () => Promise.reject(new ClockifyError(400, "400", "Project has time entries"));
    (ctx.client as any).archiveProject = () => Promise.resolve({ id: "P1", name: "x", archived: true });
    const res = await findTool("delete_project").handler({ id: "P1" }, ctx);
    expect(res).toEqual({ action: "archived", id: "P1" });
  });

  it("delete_project rethrows unrelated errors", async () => {
    const ctx = makeContext();
    (ctx.client as any).deleteProject = () => Promise.reject(new ClockifyError(500, "500", "boom"));
    await expect(findTool("delete_project").handler({ id: "P1" }, ctx)).rejects.toMatchObject({ status: 500 });
  });
});
