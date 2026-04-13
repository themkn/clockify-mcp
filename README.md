# clockify-mcp

An [MCP server](https://modelcontextprotocol.io) that lets Claude manage your
[Clockify](https://clockify.me) account: time entries (full CRUD plus
start/stop timer), projects, tasks, tags, and clients.

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
