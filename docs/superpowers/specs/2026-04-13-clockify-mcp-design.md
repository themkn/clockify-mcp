# Clockify MCP Server — Design

**Date:** 2026-04-13
**Status:** Approved (pending spec review)

## Purpose

An MCP server that lets Claude manage the user's Clockify account: time entries
(full CRUD plus start/stop timer), projects, tasks, tags, and clients. Intended
to be published publicly on GitHub so other Clockify users can install it.

## Scope

**In scope:**
- Full CRUD on time entries, projects, tasks, tags, clients
- Start/stop running timer, query the currently running entry
- Single-workspace operation (workspace ID fixed in config)
- Single-user operation (user ID auto-resolved at startup)

**Out of scope (for v1):**
- Multi-workspace switching
- Reports / aggregations / invoices
- Approvals, time-off, schedules
- Admin-only endpoints (user management, workspace settings)
- Webhooks

## Architecture

- **Stack:** Node 20+, TypeScript, `@modelcontextprotocol/sdk`, native `fetch`
- **Transport:** stdio (how Claude Code launches MCP servers)
- **Dependencies (runtime):** `@modelcontextprotocol/sdk`, `zod`. Nothing else.
- **Dependencies (dev):** `typescript`, `vitest`, `@types/node`.

### Runtime flow

```
Claude Code
   │ stdio JSON-RPC
   ▼
MCP server (src/index.ts)
   │
   ▼
Tool handlers (src/tools/*.ts)
   │  (zod-validated input)
   ▼
ClockifyClient (src/clockify/client.ts)
   │  fetch → https://api.clockify.me/api/v1
   ▼
Clockify REST API
```

### Startup sequence

1. Load `~/.clockify-mcp/config.json`.
2. Check file permissions; refuse to start if group/other-readable.
3. Validate schema: `{ apiKey: string, workspaceId: string }`.
4. Call `GET /user` once; cache `userId` in memory.
5. Register tools with the MCP SDK.
6. Start stdio transport.

### Project layout

```
src/
  index.ts            # entry point, stdio transport
  config.ts           # load, permission-check, validate
  server.ts           # wires tools into the MCP SDK
  clockify/
    client.ts         # fetch wrapper, auth, error mapping
    types.ts          # API response types
  tools/
    timeEntries.ts
    projects.ts
    tasks.ts
    tags.ts
    clients.ts
    meta.ts           # get_current_user, get_workspace
tests/
  clockify/client.test.ts
  tools/*.test.ts
docs/
  superpowers/specs/  # this file
config.example.json
package.json
tsconfig.json
README.md
SECURITY.md
LICENSE
.github/
  workflows/ci.yml
```

## Tool surface (~24 tools)

All tools live in a single namespace. Inputs validated with zod; outputs are
compact JSON shaped for the LLM (not raw Clockify payloads).

### Time entries

- `list_time_entries` — filter by `start`/`end` (ISO), `projectId`,
  `descriptionContains`, pagination (`page`, `pageSize`)
- `get_time_entry` — by `id`
- `create_time_entry` — `start`, `end`, `description`, optional `projectId`,
  `taskId`, `tagIds[]`, `billable`
- `update_time_entry` — patch semantics; same fields as create, all optional
- `delete_time_entry` — by `id`
- `start_timer` — create an entry with no `end`; fails if one is already running
- `stop_timer` — set `end` (defaults to now) on the currently running entry
- `get_running_timer` — returns the active entry or `null`

### Projects

- `list_projects` — filter by `name`, `clientId`, `archived`
- `get_project` — by `id`
- `create_project` — `name`, optional `clientId`, `color`, `billable`
- `update_project` — patch semantics
- `delete_project` — attempts hard delete; if Clockify refuses because the
  project has time entries, the server archives instead. Response explicitly
  reports which action ran: `{ "action": "deleted" }` or
  `{ "action": "archived" }`.

### Tasks (nested under project)

- `list_tasks` — by `projectId`
- `create_task`, `update_task`, `delete_task`

### Tags

- `list_tags`, `create_tag`, `update_tag`, `delete_tag`

### Clients

- `list_clients`, `create_client`, `update_client`, `delete_client`

### Meta

- `get_current_user` — cached user (debug/trust)
- `get_workspace` — configured workspace

### Response shape example

`list_time_entries` returns:

```json
[
  {
    "id": "...",
    "description": "...",
    "start": "2026-04-12T09:00:00Z",
    "end": "2026-04-12T11:00:00Z",
    "durationSeconds": 7200,
    "projectId": "...",
    "projectName": "...",
    "taskId": "...",
    "tagIds": ["..."],
    "billable": true
  }
]
```

Full Clockify fields (workspace metadata, hourly rates, custom fields) are
omitted to keep Claude's context small.

### IDs vs names

Tools accept IDs. If the user says "log time on project Acme," Claude calls
`list_projects` first, picks the ID, then calls `create_time_entry`. No
server-side name resolution — keeps behavior explicit.

### Timestamps

All timestamps are ISO 8601 strings with offset (e.g. `2026-04-12T09:00:00Z`).
Claude is responsible for interpreting relative phrases ("yesterday 9am"); the
server does not parse natural language.

## Data flow

1. Claude invokes a tool via stdio JSON-RPC.
2. MCP SDK validates input against the tool's zod schema.
3. Tool handler calls a typed `ClockifyClient` method.
4. `ClockifyClient` builds the request (auth header, JSON body), calls `fetch`,
   parses the response.
5. Tool handler maps the response to the compact shape and returns it.

## Error handling

- `ClockifyClient` throws `ClockifyError(status, code, message)` on non-2xx.
  Strips `Authorization` / `X-Api-Key` from any debug output.
- Tool handlers catch `ClockifyError` and return MCP's standard error shape:
  ```json
  { "isError": true,
    "content": [{ "type": "text",
                  "text": "Clockify: <message> (HTTP <status>)" }] }
  ```
- 429 rate limit: no automatic retry. Error is surfaced; Claude decides whether
  to wait and retry.
- Startup errors (missing config, bad permissions, invalid JSON, unreachable
  API, bad API key): descriptive message to stderr, exit code 1.
- Already-running-timer conflict on `start_timer`: returned as a tool error, not
  a silent overwrite.

## Security

Primary threat: a public server that handles a secret granting full account
access.

### Config file handling

- Config path: `~/.clockify-mcp/config.json`. Never in the repo.
- Schema: `{ apiKey: string, workspaceId: string }`.
- Startup checks: `(stat.mode & 0o077) === 0`. If group/other have any access,
  refuse to start with a clear instruction to `chmod 600`.
- Repo ships `config.example.json` with placeholders only.
- `.gitignore` covers `config.json`, `.env*`, and any local state.

### Secret hygiene

- API key never logged, never echoed in error messages, never returned by any
  tool.
- Error mapper strips `Authorization` and `X-Api-Key` headers from anything
  included in thrown errors.
- Zero telemetry, zero analytics. Only network destination is
  `https://api.clockify.me`.

### Input validation

- Every tool uses a zod schema. MCP SDK rejects invalid input before the
  handler runs.
- Path-component params (`workspaceId`, `projectId`, `taskId`, etc.) validated
  as non-empty strings without slashes, preventing URL-path injection into the
  client.

### Network & code surface

- Base URL hardcoded to `https://api.clockify.me/api/v1`. Not overridable.
- No `child_process`, `eval`, or dynamic `require`.
- Native Node `fetch` only — no `axios`, `node-fetch`, or HTTP lib with
  transitive deps.

### Dependencies

- Minimal runtime deps (`@modelcontextprotocol/sdk`, `zod`).
- `package-lock.json` committed.
- GitHub Dependabot enabled.
- `SECURITY.md` in repo root with disclosure contact.

### README security section

- Explains that a Clockify personal API key grants full account access; the
  server cannot narrow it.
- Instructions for generating, storing, and rotating the key.
- Recommend running the server as the current user (no `sudo`).

### CI

- GitHub Actions runs on PRs and main:
  - `tsc --noEmit`
  - `npm test`
  - `npm audit --audit-level=high`

## Testing

- **Unit tests** (`vitest`) on `ClockifyClient` with `fetch` stubbed. Covers:
  auth header, error mapping, header stripping, response parsing.
- **Tool tests** for each tool file: input schema validation, happy path,
  error propagation. `ClockifyClient` mocked.
- **No live integration tests in CI.** Optional `npm run test:live` script
  exists for contributors who want to validate against a real workspace.
- CI runs `npm test` + `tsc --noEmit` + `npm audit`.

## Publishing

- MIT license.
- README covers: what it does, install, config, available tools, security
  notes, contributing.
- `npm publish` as `clockify-mcp` (confirm availability before tagging v1.0.0).
- Example Claude Code MCP config snippet in README.
