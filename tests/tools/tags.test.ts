import { describe, it, expect } from "vitest";
import { tagTools } from "../../src/tools/tags.js";
import { makeContext } from "../helpers/mockClient.js";

const find = (n: string) => tagTools.find((x) => x.name === n)!;

describe("tag tools", () => {
  it("list_tags shapes", async () => {
    const ctx = makeContext();
    (ctx.client as any).listTags = () => Promise.resolve([{ id: "T1", name: "urgent", archived: false }]);
    const res = await find("list_tags").handler({}, ctx);
    expect(res).toEqual([{ id: "T1", name: "urgent", archived: false }]);
  });

  it("create_tag posts body", async () => {
    const ctx = makeContext();
    (ctx.client as any).createTag = (_ws: string, body: any) => {
      expect(body).toEqual({ name: "new" });
      return Promise.resolve({ id: "T2", name: "new" });
    };
    const res = await find("create_tag").handler({ name: "new" }, ctx);
    expect((res as any).id).toBe("T2");
  });

  it("delete_tag", async () => {
    const ctx = makeContext();
    (ctx.client as any).deleteTag = () => Promise.resolve();
    const res = await find("delete_tag").handler({ id: "T1" }, ctx);
    expect(res).toEqual({ deleted: true, id: "T1" });
  });
});
