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
