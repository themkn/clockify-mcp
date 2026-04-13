import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config.js";

let dir: string;
let path: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "clockify-mcp-test-"));
  path = join(dir, "config.json");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("loads a valid 0600 config", () => {
    writeFileSync(path, JSON.stringify({ apiKey: "k", workspaceId: "w" }), { mode: 0o600 });
    chmodSync(path, 0o600);
    const cfg = loadConfig(path);
    expect(cfg).toEqual({ apiKey: "k", workspaceId: "w" });
  });

  it("refuses world-readable files", () => {
    writeFileSync(path, JSON.stringify({ apiKey: "k", workspaceId: "w" }));
    chmodSync(path, 0o644);
    expect(() => loadConfig(path)).toThrow(/permission/i);
  });

  it("refuses group-readable files", () => {
    writeFileSync(path, JSON.stringify({ apiKey: "k", workspaceId: "w" }));
    chmodSync(path, 0o640);
    expect(() => loadConfig(path)).toThrow(/permission/i);
  });

  it("throws a clear error on missing file", () => {
    expect(() => loadConfig(path)).toThrow(/not found/i);
  });

  it("throws on invalid JSON", () => {
    writeFileSync(path, "{ not json", { mode: 0o600 });
    chmodSync(path, 0o600);
    expect(() => loadConfig(path)).toThrow(/parse/i);
  });

  it("throws on missing apiKey", () => {
    writeFileSync(path, JSON.stringify({ workspaceId: "w" }), { mode: 0o600 });
    chmodSync(path, 0o600);
    expect(() => loadConfig(path)).toThrow(/apiKey/);
  });

  it("throws on missing workspaceId", () => {
    writeFileSync(path, JSON.stringify({ apiKey: "k" }), { mode: 0o600 });
    chmodSync(path, 0o600);
    expect(() => loadConfig(path)).toThrow(/workspaceId/);
  });
});
