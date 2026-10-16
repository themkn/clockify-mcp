import { readFileSync } from "node:fs";

/**
 * Package version, read once at startup from the package.json that ships
 * alongside this module (one directory up from both `src/` and `dist/`).
 * Keeps the MCP serverInfo.version in sync with `npm version` bumps.
 */
export const PACKAGE_VERSION: string = (
  JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version: string }
).version;
