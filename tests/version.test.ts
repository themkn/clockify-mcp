import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PACKAGE_VERSION } from "../src/version.js";

describe("PACKAGE_VERSION", () => {
  it("matches the version in package.json", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { version: string };
    expect(PACKAGE_VERSION).toBe(pkg.version);
    expect(PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
