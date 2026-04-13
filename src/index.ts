#!/usr/bin/env node
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
