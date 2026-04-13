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

describe("ClockifyClient time entries", () => {
  it("listTimeEntries builds correct path and query", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    const client = new ClockifyClient("test-key");
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
    const client = new ClockifyClient("test-key");
    const body = { start: "2026-04-01T09:00:00Z", end: "2026-04-01T10:00:00Z", description: "x" };
    const entry = await client.createTimeEntry("WS", body);
    expect(entry.id).toBe("E1");
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual(body);
  });

  it("stopRunningTimer PATCHes with end", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "E1" }));
    const client = new ClockifyClient("test-key");
    await client.stopRunningTimer("WS", "U1", "2026-04-01T11:00:00Z");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(new URL(url as string).pathname).toBe("/api/v1/workspaces/WS/user/U1/time-entries");
    expect((init as RequestInit).method).toBe("PATCH");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ end: "2026-04-01T11:00:00Z" });
  });
});
