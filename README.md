# clockify-mcp — Clockify MCP Server for Claude Code

[![npm](https://img.shields.io/npm/v/@themkn/clockify-mcp)](https://www.npmjs.com/package/@themkn/clockify-mcp)

An [MCP server](https://modelcontextprotocol.io) for
[Clockify](https://clockify.me) time tracking. Start and stop timers, manage
time entries, projects, tasks, tags, and clients — directly from
[Claude Code](https://docs.anthropic.com/en/docs/claude-code) or any MCP-compatible client.

## What is Clockify?

[Clockify](https://clockify.me) is a free time tracking tool used by
freelancers and teams to log work hours, generate reports, and manage projects.
It works across web, desktop, and mobile — and its generous free tier covers
unlimited users and tracking. This MCP server lets you control Clockify with
natural language through Claude, so you never have to leave your terminal.

## Prerequisites

- **A Clockify account** — [sign up for free](https://app.clockify.me/signup)
  (the free plan is all you need)
- **A personal API key** — once logged in, go to
  *Profile settings → API → Generate*
- **Your workspace ID** — visible in the Clockify URL after selecting a
  workspace (e.g. `app.clockify.me/workspaces/<id>/...`)
- **Node.js 24+**

## Install

```sh
npm install -g @themkn/clockify-mcp
```

The binary is called `clockify-mcp` regardless of the scoped package name.

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

Paste the API key and workspace ID from the [prerequisites](#prerequisites)
above. The server will refuse to start if the config file is group- or
world-readable.

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

### Auto-approve tools

By default Claude Code asks for permission on every Clockify tool call. To
allow all Clockify tools without prompting, add this to your
`~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "mcp__clockify__*"
    ]
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

## Example prompts

Once the server is running, try asking Claude things like:

| Prompt | What happens |
| ------ | ------------ |
| "Start a timer for the standup meeting" | Starts a running timer with that description |
| "Stop my timer" | Stops the currently running timer |
| "How many hours did I log this week?" | Lists recent time entries and totals them |
| "Log 2 hours yesterday for the Website Redesign project" | Creates a time entry on the right project |
| "Create a project called 'Brand Refresh' for client Acme" | Creates a new project linked to an existing client |
| "Show me all time entries from last Monday" | Fetches entries filtered by date |
| "Tag my last time entry with 'billable'" | Updates the most recent entry with a tag |
| "Delete the 'test-cleanup' tag" | Removes a tag by name |
| "What projects do we have?" | Lists all projects in the workspace |
| "Am I tracking time right now?" | Checks for a running timer |

Claude handles the translation from natural language to API calls — you just
describe what you want in plain English.

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
