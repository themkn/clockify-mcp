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
    const client = new ClockifyClient("test-api-key");
    await expect(client.getCurrentUser()).rejects.toMatchObject({
      name: "ClockifyError",
      status: 404,
      message: "Workspace not found",
    });
  });

  it("handles non-JSON error bodies", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Bad gateway", { status: 502 }));
    const client = new ClockifyClient("test-api-key");
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
