# Clockify MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, security-conscious TypeScript MCP server that lets Claude fully manage a user's Clockify time entries, projects, tasks, tags, and clients.

**Architecture:** A stdio MCP server (`@modelcontextprotocol/sdk`) loads credentials from `~/.clockify-mcp/config.json`, resolves the current user once at startup, and exposes ~24 tools that delegate to a single typed `ClockifyClient` wrapping Clockify's REST API v1. Inputs are validated with zod; responses are shaped to compact LLM-friendly JSON; all secrets stay out of logs and errors.

**Tech Stack:** Node 20+, TypeScript, `@modelcontextprotocol/sdk`, `zod`, native `fetch`. Dev: `vitest`, `typescript`, `@types/node`.

**Spec:** `docs/superpowers/specs/2026-04-13-clockify-mcp-design.md`

---

## File Structure

Files produced by this plan:

```
package.json                          # deps + scripts
tsconfig.json                         # strict TS config
vitest.config.ts                      # test runner config
.gitignore                            # ignores config.json, node_modules, dist
config.example.json                   # placeholder config
LICENSE                               # MIT
SECURITY.md                           # disclosure contact + policy
README.md                             # usage + security
.github/workflows/ci.yml              # tsc, test, npm audit

src/index.ts                          # #!/usr/bin/env node entry
src/config.ts                         # load + validate ~/.clockify-mcp/config.json
src/server.ts                         # wires tools into MCP SDK
src/clockify/client.ts                # fetch wrapper, auth, error mapping
src/clockify/errors.ts                # ClockifyError class
src/clockify/types.ts                 # Clockify API response types
src/tools/shape.ts                    # response-shaping helpers
src/tools/timeEntries.ts              # 8 time-entry tools
src/tools/projects.ts                 # 5 project tools
src/tools/tasks.ts                    # 4 task tools
src/tools/tags.ts                     # 4 tag tools
src/tools/clients.ts                  # 4 client tools
src/tools/meta.ts                     # get_current_user, get_workspace

tests/config.test.ts
tests/clockify/client.test.ts
tests/tools/timeEntries.test.ts
tests/tools/projects.test.ts
tests/tools/tasks.test.ts
tests/tools/tags.test.ts
tests/tools/clients.test.ts
tests/tools/meta.test.ts
tests/helpers/mockClient.ts           # ClockifyClient mock used across tool tests
```

One responsibility per file. `client.ts` is the only place `fetch` is called. Each tool file registers related tools on the MCP server. Tests mirror `src/` structure.

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "clockify-mcp",
  "version": "0.1.0",
  "description": "MCP server for managing Clockify time entries, projects, tasks, tags, and clients.",
  "license": "MIT",
  "type": "module",
  "bin": {
    "clockify-mcp": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "files": ["dist", "README.md", "SECURITY.md", "LICENSE", "config.example.json"],
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "audit": "npm audit --audit-level=high"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "tests"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
});
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
coverage/
*.log
.DS_Store
config.json
.env
.env.*
```

- [ ] **Step 5: Install dependencies and verify build toolchain**

Run: `npm install`
Expected: installs without errors, produces `package-lock.json`.

Run: `npx tsc --noEmit`
Expected: no errors (empty `src/` means nothing to compile, but tsc should exit 0).

Run: `npx vitest run`
Expected: "No test files found" — exits 0 or 1 depending on version; that's OK because the next tasks add tests.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore
git commit -m "chore: scaffold Node/TypeScript project with vitest"
```

---

## Task 2: Repo metadata (license, security, example config, README skeleton)

**Files:**
- Create: `LICENSE`
- Create: `SECURITY.md`
- Create: `config.example.json`
- Create: `README.md`

- [ ] **Step 1: Create `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 <OWNER>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Replace `<OWNER>` with the actual owner before publishing.

- [ ] **Step 2: Create `SECURITY.md`**

```markdown
# Security Policy

## Reporting a vulnerability

Please report security issues by email to <SECURITY-CONTACT-EMAIL>.
Do not open a public GitHub issue for suspected vulnerabilities.

We aim to respond within 72 hours and to publish a fix for confirmed issues
within 14 days.

## Scope

This server handles a Clockify personal API key with full account access.
Issues of particular interest:
- Leaks of the API key in logs, errors, or tool responses
- Bypasses of the config-file permission check
- Any code path that calls out to a destination other than `api.clockify.me`
- Input-validation bypasses in tool handlers
```

- [ ] **Step 3: Create `config.example.json`**

```json
{
  "apiKey": "REPLACE_WITH_YOUR_CLOCKIFY_API_KEY",
  "workspaceId": "REPLACE_WITH_YOUR_WORKSPACE_ID"
}
```

- [ ] **Step 4: Create `README.md` skeleton** (filled out in Task 19)

```markdown
# clockify-mcp

MCP server that lets Claude manage your Clockify time entries, projects,
tasks, tags, and clients.

> Status: under construction. Docs will be filled in when the first release
> ships.
```

- [ ] **Step 5: Commit**

```bash
git add LICENSE SECURITY.md config.example.json README.md
git commit -m "docs: add license, security policy, example config, README skeleton"
```

---

## Task 3: Config loader with permission check

**Files:**
- Create: `src/config.ts`
- Test: `tests/config.test.ts`

Config is loaded from `~/.clockify-mcp/config.json`. We:
1. Refuse to start if the file's mode grants any access to group or other (`mode & 0o077 !== 0`).
2. Parse JSON and validate with zod.
3. Return a typed `Config`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/config.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/config.test.ts`
Expected: FAIL — `loadConfig` is not exported from `src/config.ts`.

- [ ] **Step 3: Implement `src/config.ts`**

```ts
// src/config.ts
import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

export const DEFAULT_CONFIG_PATH = join(homedir(), ".clockify-mcp", "config.json");

const ConfigSchema = z.object({
  apiKey: z.string().min(1, "apiKey must be a non-empty string"),
  workspaceId: z.string().min(1, "workspaceId must be a non-empty string"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(path: string = DEFAULT_CONFIG_PATH): Config {
  let stat;
  try {
    stat = statSync(path);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Config not found at ${path}. Create it with mode 0600, e.g.\n` +
          `  mkdir -p ~/.clockify-mcp && chmod 700 ~/.clockify-mcp\n` +
          `  echo '{"apiKey":"...","workspaceId":"..."}' > ${path}\n` +
          `  chmod 600 ${path}`,
      );
    }
    throw err;
  }

  if ((stat.mode & 0o077) !== 0) {
    const current = (stat.mode & 0o777).toString(8);
    throw new Error(
      `Config file ${path} has insecure permission ${current}. Run: chmod 600 ${path}`,
    );
  }

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(`Unable to read ${path}: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse ${path}: ${(err as Error).message}`);
  }

  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid config (${path}): ${msg}`);
  }
  return result.data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/config.test.ts`
Expected: all 7 tests PASS.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat(config): load and validate ~/.clockify-mcp/config.json with permission check"
```

---

## Task 4: `ClockifyError` class

**Files:**
- Create: `src/clockify/errors.ts`

Introduces the error type used everywhere. No test file yet — exercised in Task 5.

- [ ] **Step 1: Create `src/clockify/errors.ts`**

```ts
// src/clockify/errors.ts
export class ClockifyError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "ClockifyError";
  }

  /** Human-facing one-liner used in MCP tool error responses. */
  toUserMessage(): string {
    return `Clockify: ${this.message} (HTTP ${this.status})`;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/clockify/errors.ts
git commit -m "feat(clockify): add ClockifyError class"
```

---

## Task 5: `ClockifyClient` core (auth, fetch, error mapping)

**Files:**
- Create: `src/clockify/types.ts`
- Create: `src/clockify/client.ts`
- Test: `tests/clockify/client.test.ts`

Core `fetch` wrapper. Only file that touches the network. Base URL hardcoded. Auth header is `X-Api-Key`. Methods for specific endpoints land in Tasks 7, 9, 11, 13, 15, 17.

- [ ] **Step 1: Create `src/clockify/types.ts`** (starter set — extended in later tasks)

```ts
// src/clockify/types.ts
export interface ClockifyUser {
  id: string;
  email: string;
  name: string;
  activeWorkspace: string;
  defaultWorkspace: string;
}
```

- [ ] **Step 2: Write the failing tests**

```ts
// tests/clockify/client.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ClockifyClient } from "../../src/clockify/client.js";
import { ClockifyError } from "../../src/clockify/errors.js";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("ClockifyClient", () => {
  it("sends X-Api-Key header and hits api.clockify.me", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "u1", email: "a@b", name: "A", activeWorkspace: "w", defaultWorkspace: "w" }));
    const client = new ClockifyClient("secret-key");
    await client.getCurrentUser();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.clockify.me/api/v1/user");
    expect((init as RequestInit).method).toBe("GET");
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("X-Api-Key")).toBe("secret-key");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("parses Clockify error envelope into ClockifyError", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 1001, message: "Workspace not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = new ClockifyClient("k");
    await expect(client.getCurrentUser()).rejects.toMatchObject({
      name: "ClockifyError",
      status: 404,
      message: "Workspace not found",
    });
  });

  it("handles non-JSON error bodies", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Bad gateway", { status: 502 }));
    const client = new ClockifyClient("k");
    await expect(client.getCurrentUser()).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining("HTTP 502"),
    });
  });

  it("error messages never contain the API key", async () => {
    fetchMock.mockResolvedValueOnce(new Response("unauthorized: secret-key", { status: 401 }));
    const client = new ClockifyClient("secret-key");
    try {
      await client.getCurrentUser();
      expect.fail("expected throw");
    } catch (err) {
      const e = err as ClockifyError;
      expect(e).toBeInstanceOf(ClockifyError);
      expect(e.message).not.toContain("secret-key");
      expect(e.toUserMessage()).not.toContain("secret-key");
    }
  });

  it("wraps network errors with a safe message", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED secret-key"));
    const client = new ClockifyClient("secret-key");
    try {
      await client.getCurrentUser();
      expect.fail("expected throw");
    } catch (err) {
      const e = err as ClockifyError;
      expect(e).toBeInstanceOf(ClockifyError);
      expect(e.status).toBe(0);
      expect(e.message).not.toContain("secret-key");
    }
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/clockify/client.test.ts`
Expected: FAIL — `ClockifyClient` / `getCurrentUser` not implemented.

- [ ] **Step 4: Implement `src/clockify/client.ts`**

```ts
// src/clockify/client.ts
import { ClockifyError } from "./errors.js";
import type { ClockifyUser } from "./types.js";

const BASE_URL = "https://api.clockify.me/api/v1";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export class ClockifyClient {
  constructor(private readonly apiKey: string) {
    if (!apiKey) throw new Error("ClockifyClient requires an API key");
  }

  async getCurrentUser(): Promise<ClockifyUser> {
    return this.request<ClockifyUser>("/user");
  }

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, opts.query);
    const init: RequestInit = {
      method: opts.method ?? "GET",
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    };

    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err) {
      throw this.wrapNetworkError(err);
    }

    if (!res.ok) {
      throw await this.parseError(res);
    }

    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return undefined as T;
    }

    const ctype = res.headers.get("content-type") ?? "";
    if (ctype.includes("application/json")) {
      return (await res.json()) as T;
    }
    // No JSON body on success — return undefined cast.
    return undefined as T;
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const u = new URL(BASE_URL + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined) continue;
        u.searchParams.set(k, String(v));
      }
    }
    return u.toString();
  }

  private async parseError(res: Response): Promise<ClockifyError> {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    if (isClockifyErrorBody(body)) {
      return new ClockifyError(res.status, String(body.code), sanitize(body.message, this.apiKey));
    }
    return new ClockifyError(res.status, undefined, `HTTP ${res.status} ${res.statusText}`.trim());
  }

  private wrapNetworkError(err: unknown): ClockifyError {
    const raw = err instanceof Error ? err.message : String(err);
    return new ClockifyError(0, undefined, `network error: ${sanitize(raw, this.apiKey)}`);
  }
}

function isClockifyErrorBody(body: unknown): body is { code: number | string; message: string } {
  return (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  );
}

/** Defensive scrubber: strip the API key if it ever appears in a message. */
function sanitize(message: string, apiKey: string): string {
  if (!apiKey) return message;
  return message.split(apiKey).join("[redacted]");
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/clockify/client.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/clockify/client.ts src/clockify/types.ts src/clockify/errors.ts tests/clockify/client.test.ts
git commit -m "feat(clockify): add ClockifyClient with auth, error mapping, and key scrubbing"
```

---

## Task 6: MCP server bootstrap (no tools yet)

**Files:**
- Create: `src/index.ts`
- Create: `src/server.ts`

Bootstraps the server: load config, resolve current user, create the MCP `Server`, connect stdio, no tools yet. We verify boot manually and via a smoke test in Task 7.

- [ ] **Step 1: Create `src/server.ts`**

```ts
// src/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import type { ZodTypeAny } from "zod";
import { ClockifyClient } from "./clockify/client.js";
import { ClockifyError } from "./clockify/errors.js";
import type { Config } from "./config.js";
import type { ClockifyUser } from "./clockify/types.js";

export interface ToolDefinition<Input> {
  name: string;
  description: string;
  schema: ZodTypeAny;
  handler: (input: Input, ctx: ToolContext) => Promise<unknown>;
}

export interface ToolContext {
  client: ClockifyClient;
  config: Config;
  user: ClockifyUser;
}

export interface ServerBootstrap {
  config: Config;
  user: ClockifyUser;
  client: ClockifyClient;
  tools: ToolDefinition<unknown>[];
}

export function buildServer(bootstrap: ServerBootstrap): Server {
  const { config, user, client, tools } = bootstrap;
  const byName = new Map(tools.map((t) => [t.name, t]));
  const ctx: ToolContext = { client, config, user };

  const mcp = new Server(
    { name: "clockify-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map<Tool>((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.schema),
    })),
  }));

  mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = byName.get(req.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
      };
    }
    const parsed = tool.schema.safeParse(req.params.arguments ?? {});
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return {
        isError: true,
        content: [{ type: "text", text: `Invalid input: ${msg}` }],
      };
    }
    try {
      const result = await tool.handler(parsed.data, ctx);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const text =
        err instanceof ClockifyError
          ? err.toUserMessage()
          : `Unexpected error: ${(err as Error).message}`;
      return { isError: true, content: [{ type: "text", text }] };
    }
  });

  return mcp;
}

export async function runServer(bootstrap: ServerBootstrap): Promise<void> {
  const server = buildServer(bootstrap);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/**
 * Minimal zod → JSON Schema projection sufficient for MCP tool discovery.
 * We import `zod-to-json-schema` lazily only if needed in tests; for runtime
 * we rely on zod's own `.describe()` metadata by emitting a permissive
 * object schema derived from the top-level shape.
 *
 * Clients still use the zod schema for actual validation (above), so this
 * shape just needs to be serializable and roughly correct.
 */
function zodToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  // Lazy require to avoid forcing users to install if they don't call this.
  // Use a tiny hand-rolled converter that handles object shapes we emit.
  const def = (schema as unknown as { _def: { typeName: string; shape?: () => Record<string, ZodTypeAny> } })._def;
  if (def.typeName === "ZodObject" && def.shape) {
    const shape = def.shape();
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodLeafToJsonSchema(value);
      if (!value.isOptional()) required.push(key);
    }
    return { type: "object", properties, required, additionalProperties: false };
  }
  return { type: "object" };
}

function zodLeafToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  const name = (schema as unknown as { _def: { typeName: string } })._def.typeName;
  switch (name) {
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodArray":
      return { type: "array", items: { type: "string" } };
    case "ZodOptional":
      return zodLeafToJsonSchema((schema as unknown as { _def: { innerType: ZodTypeAny } })._def.innerType);
    case "ZodDefault":
      return zodLeafToJsonSchema((schema as unknown as { _def: { innerType: ZodTypeAny } })._def.innerType);
    default:
      return {};
  }
}
```

- [ ] **Step 2: Create `src/index.ts`**

```ts
#!/usr/bin/env node
// src/index.ts
import { loadConfig } from "./config.js";
import { ClockifyClient } from "./clockify/client.js";
import { runServer, type ToolDefinition } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new ClockifyClient(config.apiKey);
  const user = await client.getCurrentUser();

  const tools: ToolDefinition<unknown>[] = [];
  // Tool registrations are added in later tasks.

  await runServer({ config, user, client, tools });
}

main().catch((err: Error) => {
  process.stderr.write(`clockify-mcp: ${err.message}\n`);
  process.exit(1);
});
```

- [ ] **Step 3: Build to confirm it compiles**

Run: `npx tsc`
Expected: no errors; `dist/index.js` produced.

- [ ] **Step 4: Smoke test the boot** (skip if `CLOCKIFY_SKIP_BOOT=1`)

Option A — with a real config at `~/.clockify-mcp/config.json`:
Run: `node dist/index.js < /dev/null`
Expected: process exits cleanly (stdio transport closes when stdin ends). No stderr output.

Option B — without a config (fast path):
Run: `node dist/index.js`
Expected: exits 1 with `clockify-mcp: Config not found at /Users/.../config.json. ...`

- [ ] **Step 5: Commit**

```bash
git add src/index.ts src/server.ts
git commit -m "feat(server): bootstrap MCP stdio server with tool registration plumbing"
```

---

## Task 7: Shared test helper — `mockClient`

**Files:**
- Create: `tests/helpers/mockClient.ts`

Used by every tool test so we don't duplicate the mocking boilerplate.

- [ ] **Step 1: Create `tests/helpers/mockClient.ts`**

```ts
// tests/helpers/mockClient.ts
import { vi } from "vitest";
import type { ClockifyClient } from "../../src/clockify/client.js";
import type { ClockifyUser } from "../../src/clockify/types.js";
import type { ToolContext } from "../../src/server.js";
import type { Config } from "../../src/config.js";

export function makeContext(): ToolContext & {
  mockRequest: ReturnType<typeof vi.fn>;
} {
  const mockRequest = vi.fn();
  const client = { request: mockRequest, getCurrentUser: vi.fn() } as unknown as ClockifyClient;
  const config: Config = { apiKey: "k", workspaceId: "WS" };
  const user: ClockifyUser = {
    id: "U1",
    email: "a@b",
    name: "A",
    activeWorkspace: "WS",
    defaultWorkspace: "WS",
  };
  return { client, config, user, mockRequest };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add tests/helpers/mockClient.ts
git commit -m "test: add shared mockClient helper"
```

---

## Task 8: Response-shaping helpers

**Files:**
- Create: `src/tools/shape.ts`

Centralizes the "pick these fields, compute duration, rename" logic so tool files stay focused on registration.

- [ ] **Step 1: Create `src/tools/shape.ts`**

```ts
// src/tools/shape.ts
interface RawTimeEntry {
  id: string;
  description?: string;
  timeInterval?: { start?: string; end?: string | null; duration?: string | null };
  projectId?: string | null;
  project?: { id?: string; name?: string } | null;
  taskId?: string | null;
  tagIds?: string[] | null;
  billable?: boolean;
}

export interface TimeEntrySummary {
  id: string;
  description: string;
  start: string | null;
  end: string | null;
  durationSeconds: number | null;
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
  tagIds: string[];
  billable: boolean;
}

export function shapeTimeEntry(e: RawTimeEntry): TimeEntrySummary {
  const start = e.timeInterval?.start ?? null;
  const end = e.timeInterval?.end ?? null;
  return {
    id: e.id,
    description: e.description ?? "",
    start,
    end,
    durationSeconds: computeDurationSeconds(start, end),
    projectId: e.projectId ?? e.project?.id ?? null,
    projectName: e.project?.name ?? null,
    taskId: e.taskId ?? null,
    tagIds: e.tagIds ?? [],
    billable: e.billable ?? false,
  };
}

function computeDurationSeconds(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const ms = Date.parse(end) - Date.parse(start);
  return Number.isFinite(ms) ? Math.round(ms / 1000) : null;
}

interface RawProject {
  id: string;
  name: string;
  clientId?: string | null;
  clientName?: string | null;
  archived?: boolean;
  billable?: boolean;
  color?: string | null;
  note?: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  archived: boolean;
  billable: boolean;
  color: string | null;
}

export function shapeProject(p: RawProject): ProjectSummary {
  return {
    id: p.id,
    name: p.name,
    clientId: p.clientId ?? null,
    clientName: p.clientName ?? null,
    archived: p.archived ?? false,
    billable: p.billable ?? false,
    color: p.color ?? null,
  };
}

interface RawTask {
  id: string;
  name: string;
  projectId: string;
  status?: string;
  assigneeIds?: string[];
  estimate?: string | null;
}

export interface TaskSummary {
  id: string;
  name: string;
  projectId: string;
  status: string | null;
  assigneeIds: string[];
  estimate: string | null;
}

export function shapeTask(t: RawTask): TaskSummary {
  return {
    id: t.id,
    name: t.name,
    projectId: t.projectId,
    status: t.status ?? null,
    assigneeIds: t.assigneeIds ?? [],
    estimate: t.estimate ?? null,
  };
}

interface RawTag {
  id: string;
  name: string;
  archived?: boolean;
}

export interface TagSummary {
  id: string;
  name: string;
  archived: boolean;
}

export function shapeTag(t: RawTag): TagSummary {
  return { id: t.id, name: t.name, archived: t.archived ?? false };
}

interface RawClient {
  id: string;
  name: string;
  archived?: boolean;
  note?: string | null;
}

export interface ClientSummary {
  id: string;
  name: string;
  archived: boolean;
  note: string | null;
}

export function shapeClient(c: RawClient): ClientSummary {
  return { id: c.id, name: c.name, archived: c.archived ?? false, note: c.note ?? null };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/shape.ts
git commit -m "feat(tools): add response-shaping helpers for Clockify resources"
```

---

## Task 9: Meta tools — `get_current_user`, `get_workspace`

**Files:**
- Create: `src/tools/meta.ts`
- Test: `tests/tools/meta.test.ts`
- Modify: `src/index.ts` (register the tools)

Simplest tools; validate the wiring end-to-end.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/tools/meta.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tools/meta.test.ts`
Expected: FAIL — `metaTools` not exported.

- [ ] **Step 3: Create `src/tools/meta.ts`**

```ts
// src/tools/meta.ts
import { z } from "zod";
import type { ToolDefinition } from "../server.js";

const Empty = z.object({}).strict();

export const metaTools: ToolDefinition<unknown>[] = [
  {
    name: "get_current_user",
    description: "Return the Clockify user this server is acting as (resolved from the configured API key at startup).",
    schema: Empty,
    handler: async (_input, ctx) => ({
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
    }),
  },
  {
    name: "get_workspace",
    description: "Return the workspace id this server operates against.",
    schema: Empty,
    handler: async (_input, ctx) => ({ workspaceId: ctx.config.workspaceId }),
  },
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/tools/meta.test.ts`
Expected: both tests PASS.

- [ ] **Step 5: Register tools in `src/index.ts`**

Replace the empty `tools` array in `src/index.ts:11`:

```ts
#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { ClockifyClient } from "./clockify/client.js";
import { runServer, type ToolDefinition } from "./server.js";
import { metaTools } from "./tools/meta.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new ClockifyClient(config.apiKey);
  const user = await client.getCurrentUser();

  const tools: ToolDefinition<unknown>[] = [...metaTools];

  await runServer({ config, user, client, tools });
}

main().catch((err: Error) => {
  process.stderr.write(`clockify-mcp: ${err.message}\n`);
  process.exit(1);
});
```

- [ ] **Step 6: Typecheck and build**

Run: `npx tsc --noEmit && npx tsc`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/tools/meta.ts tests/tools/meta.test.ts src/index.ts
git commit -m "feat(tools): add get_current_user and get_workspace"
```

---

## Task 10: Time-entry client methods

**Files:**
- Modify: `src/clockify/client.ts` — add typed methods
- Modify: `src/clockify/types.ts` — add `RawTimeEntry`, `CreateTimeEntryBody`, `UpdateTimeEntryBody`
- Test: `tests/clockify/client.test.ts` — add method coverage

Adds typed, thin wrappers around:
- `GET /workspaces/{ws}/user/{userId}/time-entries` (list; supports `in-progress`, `start`, `end`, `project`, `description`, `page`, `page-size`)
- `GET /workspaces/{ws}/time-entries/{id}`
- `POST /workspaces/{ws}/time-entries`
- `PUT /workspaces/{ws}/time-entries/{id}`
- `DELETE /workspaces/{ws}/time-entries/{id}`
- `PATCH /workspaces/{ws}/user/{userId}/time-entries` (body `{ end }`) — stops the running timer

- [ ] **Step 1: Extend `src/clockify/types.ts`**

```ts
// src/clockify/types.ts  (append)
export interface RawTimeEntry {
  id: string;
  description?: string;
  timeInterval?: { start?: string; end?: string | null; duration?: string | null };
  projectId?: string | null;
  project?: { id?: string; name?: string } | null;
  taskId?: string | null;
  tagIds?: string[] | null;
  billable?: boolean;
}

export interface CreateTimeEntryBody {
  start: string;
  end?: string;
  description?: string;
  projectId?: string;
  taskId?: string;
  tagIds?: string[];
  billable?: boolean;
}

export type UpdateTimeEntryBody = Partial<CreateTimeEntryBody>;

export interface ListTimeEntriesQuery {
  start?: string;
  end?: string;
  project?: string;
  description?: string;
  inProgress?: boolean;
  page?: number;
  pageSize?: number;
}
```

- [ ] **Step 2: Write failing tests** (append to `tests/clockify/client.test.ts`)

```ts
// additions at bottom of tests/clockify/client.test.ts
describe("ClockifyClient time entries", () => {
  it("listTimeEntries builds correct path and query", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    const client = new ClockifyClient("k");
    await client.listTimeEntries("WS", "U1", {
      start: "2026-04-01T00:00:00Z",
      end: "2026-04-02T00:00:00Z",
      project: "P1",
      description: "foo",
      inProgress: true,
      page: 2,
      pageSize: 50,
    });
    const [url] = fetchMock.mock.calls[0]!;
    const u = new URL(url as string);
    expect(u.pathname).toBe("/api/v1/workspaces/WS/user/U1/time-entries");
    expect(u.searchParams.get("start")).toBe("2026-04-01T00:00:00Z");
    expect(u.searchParams.get("end")).toBe("2026-04-02T00:00:00Z");
    expect(u.searchParams.get("project")).toBe("P1");
    expect(u.searchParams.get("description")).toBe("foo");
    expect(u.searchParams.get("in-progress")).toBe("true");
    expect(u.searchParams.get("page")).toBe("2");
    expect(u.searchParams.get("page-size")).toBe("50");
  });

  it("createTimeEntry posts body", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "E1" }));
    const client = new ClockifyClient("k");
    const body = { start: "2026-04-01T09:00:00Z", end: "2026-04-01T10:00:00Z", description: "x" };
    const entry = await client.createTimeEntry("WS", body);
    expect(entry.id).toBe("E1");
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual(body);
  });

  it("stopRunningTimer PATCHes with end", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "E1" }));
    const client = new ClockifyClient("k");
    await client.stopRunningTimer("WS", "U1", "2026-04-01T11:00:00Z");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(new URL(url as string).pathname).toBe("/api/v1/workspaces/WS/user/U1/time-entries");
    expect((init as RequestInit).method).toBe("PATCH");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ end: "2026-04-01T11:00:00Z" });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/clockify/client.test.ts`
Expected: FAIL — new methods not implemented.

- [ ] **Step 4: Implement methods in `src/clockify/client.ts`**

Add these methods to the `ClockifyClient` class (inside the class body, after `getCurrentUser`):

```ts
  // time entries
  async listTimeEntries(
    workspaceId: string,
    userId: string,
    q: import("./types.js").ListTimeEntriesQuery = {},
  ): Promise<import("./types.js").RawTimeEntry[]> {
    return this.request<import("./types.js").RawTimeEntry[]>(
      `/workspaces/${encode(workspaceId)}/user/${encode(userId)}/time-entries`,
      {
        query: {
          start: q.start,
          end: q.end,
          project: q.project,
          description: q.description,
          "in-progress": q.inProgress,
          page: q.page,
          "page-size": q.pageSize,
          hydrated: true,
        },
      },
    );
  }

  async getTimeEntry(workspaceId: string, id: string): Promise<import("./types.js").RawTimeEntry> {
    return this.request<import("./types.js").RawTimeEntry>(
      `/workspaces/${encode(workspaceId)}/time-entries/${encode(id)}`,
      { query: { hydrated: true } },
    );
  }

  async createTimeEntry(
    workspaceId: string,
    body: import("./types.js").CreateTimeEntryBody,
  ): Promise<import("./types.js").RawTimeEntry> {
    return this.request<import("./types.js").RawTimeEntry>(
      `/workspaces/${encode(workspaceId)}/time-entries`,
      { method: "POST", body },
    );
  }

  async updateTimeEntry(
    workspaceId: string,
    id: string,
    body: import("./types.js").UpdateTimeEntryBody,
  ): Promise<import("./types.js").RawTimeEntry> {
    return this.request<import("./types.js").RawTimeEntry>(
      `/workspaces/${encode(workspaceId)}/time-entries/${encode(id)}`,
      { method: "PUT", body },
    );
  }

  async deleteTimeEntry(workspaceId: string, id: string): Promise<void> {
    await this.request<void>(
      `/workspaces/${encode(workspaceId)}/time-entries/${encode(id)}`,
      { method: "DELETE" },
    );
  }

  async stopRunningTimer(
    workspaceId: string,
    userId: string,
    end: string,
  ): Promise<import("./types.js").RawTimeEntry> {
    return this.request<import("./types.js").RawTimeEntry>(
      `/workspaces/${encode(workspaceId)}/user/${encode(userId)}/time-entries`,
      { method: "PATCH", body: { end } },
    );
  }
```

Add at the bottom of `src/clockify/client.ts` (outside the class):

```ts
function encode(segment: string): string {
  if (!segment || segment.includes("/") || segment.includes("?") || segment.includes("#")) {
    throw new Error(`Invalid path segment: ${JSON.stringify(segment)}`);
  }
  return encodeURIComponent(segment);
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/clockify/client.test.ts`
Expected: all tests PASS.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/clockify/client.ts src/clockify/types.ts tests/clockify/client.test.ts
git commit -m "feat(clockify): add time-entry client methods"
```

---

## Task 11: Time-entry tools (CRUD + timer)

**Files:**
- Create: `src/tools/timeEntries.ts`
- Test: `tests/tools/timeEntries.test.ts`
- Modify: `src/index.ts` — register tools

Tools exposed:
- `list_time_entries`
- `get_time_entry`
- `create_time_entry`
- `update_time_entry`
- `delete_time_entry`
- `start_timer`
- `stop_timer`
- `get_running_timer`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/tools/timeEntries.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/tools/timeEntries.test.ts`
Expected: FAIL — `timeEntryTools` not exported.

- [ ] **Step 3: Implement `src/tools/timeEntries.ts`**

```ts
// src/tools/timeEntries.ts
import { z } from "zod";
import type { ToolContext, ToolDefinition } from "../server.js";
import { shapeTimeEntry } from "./shape.js";
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
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(200).optional(),
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
    billable: z.boolean().optional(),
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
    billable: z.boolean().optional(),
  })
  .strict();

const DeleteInput = z.object({ id: idString }).strict();

const StartInput = z
  .object({
    description: z.string().optional(),
    projectId: idString.optional(),
    taskId: idString.optional(),
    tagIds: z.array(idString).optional(),
    billable: z.boolean().optional(),
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
        throw Object.assign(new Error(`A timer is already running (id ${running.id}). Stop it before starting a new one.`), {});
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
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/tools/timeEntries.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Register in `src/index.ts`**

Replace tools list:

```ts
import { timeEntryTools } from "./tools/timeEntries.js";
// ...
const tools: ToolDefinition<unknown>[] = [...metaTools, ...timeEntryTools];
```

- [ ] **Step 6: Typecheck and build**

Run: `npx tsc --noEmit && npx tsc`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/tools/timeEntries.ts tests/tools/timeEntries.test.ts src/index.ts
git commit -m "feat(tools): add time-entry CRUD and timer tools"
```

---

## Task 12: Project client methods + tools (with archive-on-delete fallback)

**Files:**
- Modify: `src/clockify/client.ts` — add project methods
- Modify: `src/clockify/types.ts` — add project shapes
- Create: `src/tools/projects.ts`
- Test: `tests/tools/projects.test.ts`
- Modify: `src/index.ts`

API:
- `GET /workspaces/{ws}/projects?name=&clientIds=&archived=&page=&page-size=`
- `GET /workspaces/{ws}/projects/{id}`
- `POST /workspaces/{ws}/projects` body `{ name, clientId?, color?, billable? }`
- `PUT /workspaces/{ws}/projects/{id}` (full update)
- `DELETE /workspaces/{ws}/projects/{id}` → fails with 403/400 if project has time entries
- `PATCH /workspaces/{ws}/projects/{id}` body `{ archived: true }` → archives

- [ ] **Step 1: Extend types and client**

Append to `src/clockify/types.ts`:

```ts
export interface RawProject {
  id: string;
  name: string;
  clientId?: string | null;
  clientName?: string | null;
  archived?: boolean;
  billable?: boolean;
  color?: string | null;
  note?: string | null;
}

export interface CreateProjectBody {
  name: string;
  clientId?: string;
  color?: string;
  billable?: boolean;
  isPublic?: boolean;
  note?: string;
}

export type UpdateProjectBody = Partial<CreateProjectBody>;

export interface ListProjectsQuery {
  name?: string;
  clientIds?: string[];
  archived?: boolean;
  page?: number;
  pageSize?: number;
}
```

Add inside `ClockifyClient`:

```ts
  async listProjects(
    workspaceId: string,
    q: import("./types.js").ListProjectsQuery = {},
  ): Promise<import("./types.js").RawProject[]> {
    return this.request<import("./types.js").RawProject[]>(
      `/workspaces/${encode(workspaceId)}/projects`,
      {
        query: {
          name: q.name,
          "clients": q.clientIds?.join(","),
          archived: q.archived,
          page: q.page,
          "page-size": q.pageSize,
        },
      },
    );
  }

  async getProject(workspaceId: string, id: string): Promise<import("./types.js").RawProject> {
    return this.request<import("./types.js").RawProject>(
      `/workspaces/${encode(workspaceId)}/projects/${encode(id)}`,
    );
  }

  async createProject(
    workspaceId: string,
    body: import("./types.js").CreateProjectBody,
  ): Promise<import("./types.js").RawProject> {
    return this.request<import("./types.js").RawProject>(
      `/workspaces/${encode(workspaceId)}/projects`,
      { method: "POST", body },
    );
  }

  async updateProject(
    workspaceId: string,
    id: string,
    body: import("./types.js").UpdateProjectBody,
  ): Promise<import("./types.js").RawProject> {
    return this.request<import("./types.js").RawProject>(
      `/workspaces/${encode(workspaceId)}/projects/${encode(id)}`,
      { method: "PUT", body },
    );
  }

  async deleteProject(workspaceId: string, id: string): Promise<void> {
    await this.request<void>(
      `/workspaces/${encode(workspaceId)}/projects/${encode(id)}`,
      { method: "DELETE" },
    );
  }

  async archiveProject(workspaceId: string, id: string): Promise<import("./types.js").RawProject> {
    return this.request<import("./types.js").RawProject>(
      `/workspaces/${encode(workspaceId)}/projects/${encode(id)}`,
      { method: "PATCH", body: { archived: true } },
    );
  }
```

- [ ] **Step 2: Write failing tool tests**

```ts
// tests/tools/projects.test.ts
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
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/tools/projects.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/tools/projects.ts`**

```ts
// src/tools/projects.ts
import { z } from "zod";
import type { ToolContext, ToolDefinition } from "../server.js";
import { ClockifyError } from "../clockify/errors.js";
import { shapeProject } from "./shape.js";
import type { CreateProjectBody, RawProject, UpdateProjectBody } from "../clockify/types.js";

const idString = z.string().min(1).refine((s) => !s.includes("/"), "must not contain '/'");

const ListInput = z
  .object({
    name: z.string().min(1).optional(),
    clientId: idString.optional(),
    archived: z.boolean().optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(200).optional(),
  })
  .strict();

const GetInput = z.object({ id: idString }).strict();

const CreateInput = z
  .object({
    name: z.string().min(1),
    clientId: idString.optional(),
    color: z.string().min(1).optional(),
    billable: z.boolean().optional(),
    note: z.string().optional(),
  })
  .strict();

const UpdateInput = z
  .object({
    id: idString,
    name: z.string().min(1).optional(),
    clientId: idString.optional(),
    color: z.string().min(1).optional(),
    billable: z.boolean().optional(),
    note: z.string().optional(),
  })
  .strict();

const DeleteInput = z.object({ id: idString }).strict();

type AnyClient = {
  listProjects: (ws: string, q: unknown) => Promise<RawProject[]>;
  getProject: (ws: string, id: string) => Promise<RawProject>;
  createProject: (ws: string, body: CreateProjectBody) => Promise<RawProject>;
  updateProject: (ws: string, id: string, body: UpdateProjectBody) => Promise<RawProject>;
  deleteProject: (ws: string, id: string) => Promise<void>;
  archiveProject: (ws: string, id: string) => Promise<RawProject>;
};
const c = (ctx: ToolContext) => ctx.client as unknown as AnyClient;

export const projectTools: ToolDefinition<unknown>[] = [
  {
    name: "list_projects",
    description: "List projects in the workspace. Filter by name substring, clientId, or archived state.",
    schema: ListInput,
    handler: async (input, ctx) => {
      const i = input as z.infer<typeof ListInput>;
      const raw = await c(ctx).listProjects(ctx.config.workspaceId, {
        name: i.name,
        clientIds: i.clientId ? [i.clientId] : undefined,
        archived: i.archived,
        page: i.page,
        pageSize: i.pageSize,
      });
      return raw.map(shapeProject);
    },
  },
  {
    name: "get_project",
    description: "Fetch a project by id.",
    schema: GetInput,
    handler: async (input, ctx) => {
      const { id } = input as z.infer<typeof GetInput>;
      return shapeProject(await c(ctx).getProject(ctx.config.workspaceId, id));
    },
  },
  {
    name: "create_project",
    description: "Create a project.",
    schema: CreateInput,
    handler: async (input, ctx) => {
      const body = input as CreateProjectBody;
      return shapeProject(await c(ctx).createProject(ctx.config.workspaceId, body));
    },
  },
  {
    name: "update_project",
    description: "Patch a project. Any field omitted is left unchanged.",
    schema: UpdateInput,
    handler: async (input, ctx) => {
      const { id, ...rest } = input as z.infer<typeof UpdateInput>;
      return shapeProject(await c(ctx).updateProject(ctx.config.workspaceId, id, rest));
    },
  },
  {
    name: "delete_project",
    description:
      "Attempt to delete a project. If Clockify refuses because the project has time entries, the project is archived instead. The response reports which action ran: { action: 'deleted' } or { action: 'archived' }.",
    schema: DeleteInput,
    handler: async (input, ctx) => {
      const { id } = input as z.infer<typeof DeleteInput>;
      try {
        await c(ctx).deleteProject(ctx.config.workspaceId, id);
        return { action: "deleted", id };
      } catch (err) {
        if (err instanceof ClockifyError && (err.status === 400 || err.status === 403 || err.status === 409)) {
          await c(ctx).archiveProject(ctx.config.workspaceId, id);
          return { action: "archived", id };
        }
        throw err;
      }
    },
  },
];
```

- [ ] **Step 5: Run tool tests**

Run: `npx vitest run tests/tools/projects.test.ts`
Expected: all PASS.

- [ ] **Step 6: Register in `src/index.ts`**

```ts
import { projectTools } from "./tools/projects.js";
// ...
const tools: ToolDefinition<unknown>[] = [...metaTools, ...timeEntryTools, ...projectTools];
```

- [ ] **Step 7: Typecheck and build**

Run: `npx tsc --noEmit && npx tsc`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/clockify/client.ts src/clockify/types.ts src/tools/projects.ts tests/tools/projects.test.ts src/index.ts
git commit -m "feat(tools): add project CRUD with archive-on-delete fallback"
```

---

## Task 13: Task (nested under project) client methods + tools

**Files:**
- Modify: `src/clockify/client.ts`, `src/clockify/types.ts`
- Create: `src/tools/tasks.ts`
- Test: `tests/tools/tasks.test.ts`
- Modify: `src/index.ts`

API:
- `GET /workspaces/{ws}/projects/{pid}/tasks?name=&page=&page-size=`
- `POST /workspaces/{ws}/projects/{pid}/tasks` body `{ name, assigneeIds?, estimate?, status? }`
- `PUT /workspaces/{ws}/projects/{pid}/tasks/{id}`
- `DELETE /workspaces/{ws}/projects/{pid}/tasks/{id}`

- [ ] **Step 1: Extend types**

Append to `src/clockify/types.ts`:

```ts
export interface RawTask {
  id: string;
  name: string;
  projectId: string;
  status?: string;
  assigneeIds?: string[];
  estimate?: string | null;
}

export interface CreateTaskBody {
  name: string;
  assigneeIds?: string[];
  estimate?: string;
  status?: "ACTIVE" | "DONE";
}

export type UpdateTaskBody = Partial<CreateTaskBody>;
```

- [ ] **Step 2: Add client methods**

Inside `ClockifyClient`:

```ts
  async listTasks(
    workspaceId: string,
    projectId: string,
    q: { name?: string; page?: number; pageSize?: number } = {},
  ): Promise<import("./types.js").RawTask[]> {
    return this.request<import("./types.js").RawTask[]>(
      `/workspaces/${encode(workspaceId)}/projects/${encode(projectId)}/tasks`,
      { query: { name: q.name, page: q.page, "page-size": q.pageSize } },
    );
  }

  async createTask(
    workspaceId: string,
    projectId: string,
    body: import("./types.js").CreateTaskBody,
  ): Promise<import("./types.js").RawTask> {
    return this.request<import("./types.js").RawTask>(
      `/workspaces/${encode(workspaceId)}/projects/${encode(projectId)}/tasks`,
      { method: "POST", body },
    );
  }

  async updateTask(
    workspaceId: string,
    projectId: string,
    id: string,
    body: import("./types.js").UpdateTaskBody,
  ): Promise<import("./types.js").RawTask> {
    return this.request<import("./types.js").RawTask>(
      `/workspaces/${encode(workspaceId)}/projects/${encode(projectId)}/tasks/${encode(id)}`,
      { method: "PUT", body },
    );
  }

  async deleteTask(workspaceId: string, projectId: string, id: string): Promise<void> {
    await this.request<void>(
      `/workspaces/${encode(workspaceId)}/projects/${encode(projectId)}/tasks/${encode(id)}`,
      { method: "DELETE" },
    );
  }
```

- [ ] **Step 3: Write failing tool tests**

```ts
// tests/tools/tasks.test.ts
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
```

- [ ] **Step 4: Run tests to verify failure**

Run: `npx vitest run tests/tools/tasks.test.ts`
Expected: FAIL.

- [ ] **Step 5: Implement `src/tools/tasks.ts`**

```ts
// src/tools/tasks.ts
import { z } from "zod";
import type { ToolContext, ToolDefinition } from "../server.js";
import { shapeTask } from "./shape.js";
import type { CreateTaskBody, RawTask, UpdateTaskBody } from "../clockify/types.js";

const idString = z.string().min(1).refine((s) => !s.includes("/"), "must not contain '/'");

const ListInput = z
  .object({
    projectId: idString,
    name: z.string().min(1).optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(200).optional(),
  })
  .strict();

const CreateInput = z
  .object({
    projectId: idString,
    name: z.string().min(1),
    assigneeIds: z.array(idString).optional(),
    estimate: z.string().min(1).optional(),
    status: z.enum(["ACTIVE", "DONE"]).optional(),
  })
  .strict();

const UpdateInput = z
  .object({
    projectId: idString,
    id: idString,
    name: z.string().min(1).optional(),
    assigneeIds: z.array(idString).optional(),
    estimate: z.string().min(1).optional(),
    status: z.enum(["ACTIVE", "DONE"]).optional(),
  })
  .strict();

const DeleteInput = z.object({ projectId: idString, id: idString }).strict();

type AnyClient = {
  listTasks: (ws: string, pid: string, q: unknown) => Promise<RawTask[]>;
  createTask: (ws: string, pid: string, body: CreateTaskBody) => Promise<RawTask>;
  updateTask: (ws: string, pid: string, id: string, body: UpdateTaskBody) => Promise<RawTask>;
  deleteTask: (ws: string, pid: string, id: string) => Promise<void>;
};
const c = (ctx: ToolContext) => ctx.client as unknown as AnyClient;

export const taskTools: ToolDefinition<unknown>[] = [
  {
    name: "list_tasks",
    description: "List tasks belonging to a project.",
    schema: ListInput,
    handler: async (input, ctx) => {
      const i = input as z.infer<typeof ListInput>;
      const raw = await c(ctx).listTasks(ctx.config.workspaceId, i.projectId, {
        name: i.name,
        page: i.page,
        pageSize: i.pageSize,
      });
      return raw.map(shapeTask);
    },
  },
  {
    name: "create_task",
    description: "Create a task under a project.",
    schema: CreateInput,
    handler: async (input, ctx) => {
      const { projectId, ...body } = input as z.infer<typeof CreateInput>;
      return shapeTask(await c(ctx).createTask(ctx.config.workspaceId, projectId, body));
    },
  },
  {
    name: "update_task",
    description: "Patch a task. Any field omitted is left unchanged.",
    schema: UpdateInput,
    handler: async (input, ctx) => {
      const { projectId, id, ...body } = input as z.infer<typeof UpdateInput>;
      return shapeTask(await c(ctx).updateTask(ctx.config.workspaceId, projectId, id, body));
    },
  },
  {
    name: "delete_task",
    description: "Delete a task.",
    schema: DeleteInput,
    handler: async (input, ctx) => {
      const { projectId, id } = input as z.infer<typeof DeleteInput>;
      await c(ctx).deleteTask(ctx.config.workspaceId, projectId, id);
      return { deleted: true, id };
    },
  },
];
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/tools/tasks.test.ts`
Expected: PASS.

- [ ] **Step 7: Register in `src/index.ts`**

```ts
import { taskTools } from "./tools/tasks.js";
// ...
const tools: ToolDefinition<unknown>[] = [...metaTools, ...timeEntryTools, ...projectTools, ...taskTools];
```

- [ ] **Step 8: Typecheck and build**

Run: `npx tsc --noEmit && npx tsc`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/clockify/client.ts src/clockify/types.ts src/tools/tasks.ts tests/tools/tasks.test.ts src/index.ts
git commit -m "feat(tools): add task CRUD under projects"
```

---

## Task 14: Tag client methods + tools

**Files:**
- Modify: `src/clockify/client.ts`, `src/clockify/types.ts`
- Create: `src/tools/tags.ts`
- Test: `tests/tools/tags.test.ts`
- Modify: `src/index.ts`

API:
- `GET /workspaces/{ws}/tags?name=&archived=&page=&page-size=`
- `POST /workspaces/{ws}/tags` body `{ name }`
- `PUT /workspaces/{ws}/tags/{id}` body `{ name?, archived? }`
- `DELETE /workspaces/{ws}/tags/{id}`

- [ ] **Step 1: Extend types**

Append to `src/clockify/types.ts`:

```ts
export interface RawTag {
  id: string;
  name: string;
  archived?: boolean;
}

export interface CreateTagBody { name: string }
export type UpdateTagBody = Partial<{ name: string; archived: boolean }>;
```

- [ ] **Step 2: Add client methods**

Inside `ClockifyClient`:

```ts
  async listTags(
    workspaceId: string,
    q: { name?: string; archived?: boolean; page?: number; pageSize?: number } = {},
  ): Promise<import("./types.js").RawTag[]> {
    return this.request<import("./types.js").RawTag[]>(
      `/workspaces/${encode(workspaceId)}/tags`,
      { query: { name: q.name, archived: q.archived, page: q.page, "page-size": q.pageSize } },
    );
  }

  async createTag(workspaceId: string, body: import("./types.js").CreateTagBody): Promise<import("./types.js").RawTag> {
    return this.request<import("./types.js").RawTag>(
      `/workspaces/${encode(workspaceId)}/tags`,
      { method: "POST", body },
    );
  }

  async updateTag(workspaceId: string, id: string, body: import("./types.js").UpdateTagBody): Promise<import("./types.js").RawTag> {
    return this.request<import("./types.js").RawTag>(
      `/workspaces/${encode(workspaceId)}/tags/${encode(id)}`,
      { method: "PUT", body },
    );
  }

  async deleteTag(workspaceId: string, id: string): Promise<void> {
    await this.request<void>(`/workspaces/${encode(workspaceId)}/tags/${encode(id)}`, { method: "DELETE" });
  }
```

- [ ] **Step 3: Write failing tests**

```ts
// tests/tools/tags.test.ts
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
```

- [ ] **Step 4: Run to verify failure**

Run: `npx vitest run tests/tools/tags.test.ts`
Expected: FAIL.

- [ ] **Step 5: Implement `src/tools/tags.ts`**

```ts
// src/tools/tags.ts
import { z } from "zod";
import type { ToolContext, ToolDefinition } from "../server.js";
import { shapeTag } from "./shape.js";
import type { CreateTagBody, RawTag, UpdateTagBody } from "../clockify/types.js";

const idString = z.string().min(1).refine((s) => !s.includes("/"), "must not contain '/'");

const ListInput = z
  .object({
    name: z.string().min(1).optional(),
    archived: z.boolean().optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(200).optional(),
  })
  .strict();

const CreateInput = z.object({ name: z.string().min(1) }).strict();
const UpdateInput = z.object({ id: idString, name: z.string().min(1).optional(), archived: z.boolean().optional() }).strict();
const DeleteInput = z.object({ id: idString }).strict();

type AnyClient = {
  listTags: (ws: string, q: unknown) => Promise<RawTag[]>;
  createTag: (ws: string, body: CreateTagBody) => Promise<RawTag>;
  updateTag: (ws: string, id: string, body: UpdateTagBody) => Promise<RawTag>;
  deleteTag: (ws: string, id: string) => Promise<void>;
};
const c = (ctx: ToolContext) => ctx.client as unknown as AnyClient;

export const tagTools: ToolDefinition<unknown>[] = [
  {
    name: "list_tags",
    description: "List tags in the workspace. Filter by name or archived state.",
    schema: ListInput,
    handler: async (input, ctx) => {
      const i = input as z.infer<typeof ListInput>;
      const raw = await c(ctx).listTags(ctx.config.workspaceId, i);
      return raw.map(shapeTag);
    },
  },
  {
    name: "create_tag",
    description: "Create a tag.",
    schema: CreateInput,
    handler: async (input, ctx) =>
      shapeTag(await c(ctx).createTag(ctx.config.workspaceId, input as CreateTagBody)),
  },
  {
    name: "update_tag",
    description: "Rename or archive a tag.",
    schema: UpdateInput,
    handler: async (input, ctx) => {
      const { id, ...rest } = input as z.infer<typeof UpdateInput>;
      return shapeTag(await c(ctx).updateTag(ctx.config.workspaceId, id, rest));
    },
  },
  {
    name: "delete_tag",
    description: "Delete a tag.",
    schema: DeleteInput,
    handler: async (input, ctx) => {
      const { id } = input as z.infer<typeof DeleteInput>;
      await c(ctx).deleteTag(ctx.config.workspaceId, id);
      return { deleted: true, id };
    },
  },
];
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/tools/tags.test.ts`
Expected: PASS.

- [ ] **Step 7: Register in `src/index.ts`**

```ts
import { tagTools } from "./tools/tags.js";
// ...
const tools: ToolDefinition<unknown>[] = [
  ...metaTools, ...timeEntryTools, ...projectTools, ...taskTools, ...tagTools,
];
```

- [ ] **Step 8: Typecheck and build**

Run: `npx tsc --noEmit && npx tsc`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/clockify/client.ts src/clockify/types.ts src/tools/tags.ts tests/tools/tags.test.ts src/index.ts
git commit -m "feat(tools): add tag CRUD"
```

---

## Task 15: Client (Clockify "client" resource) methods + tools

**Files:**
- Modify: `src/clockify/client.ts`, `src/clockify/types.ts`
- Create: `src/tools/clients.ts`
- Test: `tests/tools/clients.test.ts`
- Modify: `src/index.ts`

API (same shape as tags, different path):
- `GET /workspaces/{ws}/clients?name=&archived=&page=&page-size=`
- `POST /workspaces/{ws}/clients` body `{ name, note? }`
- `PUT /workspaces/{ws}/clients/{id}` body `{ name?, note?, archived? }`
- `DELETE /workspaces/{ws}/clients/{id}`

- [ ] **Step 1: Extend types**

Append to `src/clockify/types.ts`:

```ts
export interface RawClient {
  id: string;
  name: string;
  archived?: boolean;
  note?: string | null;
}

export interface CreateClientBody { name: string; note?: string }
export type UpdateClientBody = Partial<{ name: string; note: string; archived: boolean }>;
```

- [ ] **Step 2: Add client methods**

Inside `ClockifyClient`:

```ts
  async listClients(
    workspaceId: string,
    q: { name?: string; archived?: boolean; page?: number; pageSize?: number } = {},
  ): Promise<import("./types.js").RawClient[]> {
    return this.request<import("./types.js").RawClient[]>(
      `/workspaces/${encode(workspaceId)}/clients`,
      { query: { name: q.name, archived: q.archived, page: q.page, "page-size": q.pageSize } },
    );
  }

  async createClient(workspaceId: string, body: import("./types.js").CreateClientBody): Promise<import("./types.js").RawClient> {
    return this.request<import("./types.js").RawClient>(
      `/workspaces/${encode(workspaceId)}/clients`,
      { method: "POST", body },
    );
  }

  async updateClient(workspaceId: string, id: string, body: import("./types.js").UpdateClientBody): Promise<import("./types.js").RawClient> {
    return this.request<import("./types.js").RawClient>(
      `/workspaces/${encode(workspaceId)}/clients/${encode(id)}`,
      { method: "PUT", body },
    );
  }

  async deleteClient(workspaceId: string, id: string): Promise<void> {
    await this.request<void>(`/workspaces/${encode(workspaceId)}/clients/${encode(id)}`, { method: "DELETE" });
  }
```

- [ ] **Step 3: Write failing tests**

```ts
// tests/tools/clients.test.ts
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
```

- [ ] **Step 4: Run to verify failure**

Run: `npx vitest run tests/tools/clients.test.ts`
Expected: FAIL.

- [ ] **Step 5: Implement `src/tools/clients.ts`**

```ts
// src/tools/clients.ts
import { z } from "zod";
import type { ToolContext, ToolDefinition } from "../server.js";
import { shapeClient } from "./shape.js";
import type { CreateClientBody, RawClient, UpdateClientBody } from "../clockify/types.js";

const idString = z.string().min(1).refine((s) => !s.includes("/"), "must not contain '/'");

const ListInput = z
  .object({
    name: z.string().min(1).optional(),
    archived: z.boolean().optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(200).optional(),
  })
  .strict();

const CreateInput = z.object({ name: z.string().min(1), note: z.string().optional() }).strict();
const UpdateInput = z
  .object({
    id: idString,
    name: z.string().min(1).optional(),
    note: z.string().optional(),
    archived: z.boolean().optional(),
  })
  .strict();
const DeleteInput = z.object({ id: idString }).strict();

type AnyClient = {
  listClients: (ws: string, q: unknown) => Promise<RawClient[]>;
  createClient: (ws: string, body: CreateClientBody) => Promise<RawClient>;
  updateClient: (ws: string, id: string, body: UpdateClientBody) => Promise<RawClient>;
  deleteClient: (ws: string, id: string) => Promise<void>;
};
const c = (ctx: ToolContext) => ctx.client as unknown as AnyClient;

export const clientTools: ToolDefinition<unknown>[] = [
  {
    name: "list_clients",
    description: "List Clockify clients in the workspace.",
    schema: ListInput,
    handler: async (input, ctx) => {
      const raw = await c(ctx).listClients(ctx.config.workspaceId, input as never);
      return raw.map(shapeClient);
    },
  },
  {
    name: "create_client",
    description: "Create a Clockify client.",
    schema: CreateInput,
    handler: async (input, ctx) =>
      shapeClient(await c(ctx).createClient(ctx.config.workspaceId, input as CreateClientBody)),
  },
  {
    name: "update_client",
    description: "Patch a Clockify client. Any field omitted is left unchanged.",
    schema: UpdateInput,
    handler: async (input, ctx) => {
      const { id, ...rest } = input as z.infer<typeof UpdateInput>;
      return shapeClient(await c(ctx).updateClient(ctx.config.workspaceId, id, rest));
    },
  },
  {
    name: "delete_client",
    description: "Delete a Clockify client.",
    schema: DeleteInput,
    handler: async (input, ctx) => {
      const { id } = input as z.infer<typeof DeleteInput>;
      await c(ctx).deleteClient(ctx.config.workspaceId, id);
      return { deleted: true, id };
    },
  },
];
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/tools/clients.test.ts`
Expected: PASS.

- [ ] **Step 7: Register in `src/index.ts`**

```ts
import { clientTools } from "./tools/clients.js";
// ...
const tools: ToolDefinition<unknown>[] = [
  ...metaTools, ...timeEntryTools, ...projectTools, ...taskTools, ...tagTools, ...clientTools,
];
```

- [ ] **Step 8: Typecheck and build**

Run: `npx tsc --noEmit && npx tsc`
Expected: no errors.

- [ ] **Step 9: Run the full suite**

Run: `npx vitest run`
Expected: ALL tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/clockify/client.ts src/clockify/types.ts src/tools/clients.ts tests/tools/clients.test.ts src/index.ts
git commit -m "feat(tools): add client CRUD"
```

---

## Task 16: README with install, config, tools, security notes

**Files:**
- Modify: `README.md` (full replace)

- [ ] **Step 1: Replace `README.md`**

```markdown
# clockify-mcp

An [MCP server](https://modelcontextprotocol.io) that lets Claude manage your
[Clockify](https://clockify.me) account: time entries (full CRUD plus
start/stop timer), projects, tasks, tags, and clients.

## Install

```sh
npm install -g clockify-mcp
```

(Or point Claude's MCP config at the built JS locally — see below.)

## Configure

The server reads a JSON config from `~/.clockify-mcp/config.json`. Create it
with permission `600`:

```sh
mkdir -p ~/.clockify-mcp
chmod 700 ~/.clockify-mcp
cat > ~/.clockify-mcp/config.json <<'EOF'
{
  "apiKey": "YOUR_CLOCKIFY_PERSONAL_API_KEY",
  "workspaceId": "YOUR_WORKSPACE_ID"
}
EOF
chmod 600 ~/.clockify-mcp/config.json
```

- **Get an API key:** in Clockify, open *Profile settings → API → Generate*.
- **Workspace id:** visible in the Clockify URL once you select a workspace.

The server will refuse to start if the config file is group- or world-readable.

## Hook into Claude Code

Add an entry to your Claude MCP config (typically `~/.config/claude/mcp.json`
or the per-project `.claude/mcp.json`):

```json
{
  "mcpServers": {
    "clockify": {
      "command": "clockify-mcp"
    }
  }
}
```

## Tools

Grouped by resource:

| Resource     | Tools |
| ------------ | ----- |
| Time entries | `list_time_entries`, `get_time_entry`, `create_time_entry`, `update_time_entry`, `delete_time_entry`, `start_timer`, `stop_timer`, `get_running_timer` |
| Projects     | `list_projects`, `get_project`, `create_project`, `update_project`, `delete_project` |
| Tasks        | `list_tasks`, `create_task`, `update_task`, `delete_task` |
| Tags         | `list_tags`, `create_tag`, `update_tag`, `delete_tag` |
| Clients      | `list_clients`, `create_client`, `update_client`, `delete_client` |
| Meta         | `get_current_user`, `get_workspace` |

Notes:

- All timestamps are ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`). Claude interprets
  relative phrases like "yesterday 9am" before calling the tool.
- Tools accept **IDs**, not names. Claude lists projects/tasks/tags/clients
  first, picks the matching id, then acts.
- `delete_project` tries a hard delete; if Clockify refuses because the
  project has time entries, the server archives it instead. The response
  reports `{ "action": "deleted" }` or `{ "action": "archived" }`.

## Security

- The API key in `~/.clockify-mcp/config.json` grants **full access** to your
  Clockify account. This server cannot narrow that scope — Clockify's API does
  not offer read-only personal tokens. Rotate the key if you suspect
  exposure.
- The key is never logged or returned in any tool response. Errors are
  scrubbed defensively before being surfaced.
- The only network destination is `https://api.clockify.me`; there is no
  telemetry.
- Run the server as your user — never via `sudo`.

Report vulnerabilities per `SECURITY.md`.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
```

Optional: add `npm run test:live` later for integration tests against a real
workspace (not run in CI).

## License

MIT — see `LICENSE`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: expand README with install, config, tool list, and security"
```

---

## Task 17: CI — typecheck, test, audit, Dependabot

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm audit --audit-level=high
```

- [ ] **Step 2: Create `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml .github/dependabot.yml
git commit -m "ci: add GitHub Actions workflow and Dependabot config"
```

---

## Task 18: Final verification

- [ ] **Step 1: Run the full suite**

Run: `npx vitest run`
Expected: every test passes (config, client, and all five tool suites plus meta).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `npx tsc`
Expected: `dist/` produced with `index.js` and declarations.

- [ ] **Step 4: Smoke test the boot path (with a valid config)**

Run (requires a real `~/.clockify-mcp/config.json`):
`node dist/index.js < /dev/null`
Expected: exits cleanly with no stderr.

Run (without config):
`mv ~/.clockify-mcp/config.json ~/.clockify-mcp/config.json.bak 2>/dev/null; node dist/index.js; mv ~/.clockify-mcp/config.json.bak ~/.clockify-mcp/config.json 2>/dev/null`
Expected: exits 1 with a clear "Config not found" message.

- [ ] **Step 5: Audit**

Run: `npm audit --audit-level=high`
Expected: `found 0 vulnerabilities` (or a clear list to address).

- [ ] **Step 6: Confirm public-ready**

Verify:
- `.gitignore` excludes `config.json`, `node_modules/`, `dist/`.
- No real API key, workspace id, or PII anywhere in the repo:
  - Run: `npx grep -r "apiKey" -- src tests docs || true`
  - Run: `grep -r "CLOCKIFY_API_KEY" . || true` (expect only documentation hits)
- `LICENSE` has the correct `<OWNER>` substituted.
- `SECURITY.md` has a real disclosure contact substituted.

- [ ] **Step 7: Tag (optional, after the owner approves)**

```bash
git tag v0.1.0
```
