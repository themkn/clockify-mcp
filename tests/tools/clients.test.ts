import { describe, it, expect } from "vitest";
import { clientTools } from "../../src/tools/clients.js";
import { makeContext } from "../helpers/mockClient.js";

const find = (n: string) => clientTools.find((x) => x.name === n)!;

describe("client tools", () => {
  it("list_clients shapes", async () => {
    const ctx = makeContext();
    (ctx.client as any).listClients = () => Promise.resolve([{ id: "C1", name: "Acme", archived: false, note: null }]);
    const res = await find("list_clients").handler({}, ctx);
    expect(res).toEqual([{ id: "C1", name: "Acme", archived: false, note: null }]);
  });

  it("create_client posts body", async () => {
    const ctx = makeContext();
    (ctx.client as any).createClient = (_ws: string, body: any) => {
      expect(body).toEqual({ name: "New" });
      return Promise.resolve({ id: "C2", name: "New" });
    };
    const res = await find("create_client").handler({ name: "New" }, ctx);
    expect((res as any).id).toBe("C2");
  });

  it("delete_client", async () => {
    const ctx = makeContext();
    (ctx.client as any).deleteClient = () => Promise.resolve();
    const res = await find("delete_client").handler({ id: "C1" }, ctx);
    expect(res).toEqual({ deleted: true, id: "C1" });
  });
});
