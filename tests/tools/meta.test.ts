import { describe, it, expect } from "vitest";
import { metaTools } from "../../src/tools/meta.js";
import { makeContext } from "../helpers/mockClient.js";

describe("meta tools", () => {
  it("get_current_user returns cached user", async () => {
    const tool = metaTools.find((t) => t.name === "get_current_user")!;
    const ctx = makeContext();
    const result = await tool.handler({}, ctx);
    expect(result).toEqual({ id: "U1", email: "a@b", name: "A" });
  });

  it("get_workspace returns configured workspace id", async () => {
    const tool = metaTools.find((t) => t.name === "get_workspace")!;
    const ctx = makeContext();
    const result = await tool.handler({}, ctx);
    expect(result).toEqual({ workspaceId: "WS" });
  });
});
