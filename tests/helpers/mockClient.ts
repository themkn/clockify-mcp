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
