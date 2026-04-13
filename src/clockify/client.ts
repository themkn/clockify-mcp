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
      return new ClockifyError(
        res.status,
        String(body.code),
        sanitize(body.message, this.apiKey),
      );
    }
    return new ClockifyError(
      res.status,
      undefined,
      `HTTP ${res.status} ${res.statusText}`.trim(),
    );
  }

  private wrapNetworkError(err: unknown): ClockifyError {
    const raw = err instanceof Error ? err.message : String(err);
    return new ClockifyError(
      0,
      undefined,
      `network error: ${sanitize(raw, this.apiKey)}`,
    );
  }
}

function isClockifyErrorBody(
  body: unknown,
): body is { code: number | string; message: string } {
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
