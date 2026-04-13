import { ClockifyError } from "./errors.js";
import type {
  ClockifyUser,
  CreateProjectBody,
  CreateTagBody,
  CreateTaskBody,
  CreateTimeEntryBody,
  ListProjectsQuery,
  ListTimeEntriesQuery,
  RawProject,
  RawTag,
  RawTask,
  RawTimeEntry,
  UpdateProjectBody,
  UpdateTagBody,
  UpdateTaskBody,
  UpdateTimeEntryBody,
} from "./types.js";

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

  async listTimeEntries(
    workspaceId: string,
    userId: string,
    q: ListTimeEntriesQuery = {},
  ): Promise<RawTimeEntry[]> {
    return this.request<RawTimeEntry[]>(
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

  async getTimeEntry(workspaceId: string, id: string): Promise<RawTimeEntry> {
    return this.request<RawTimeEntry>(
      `/workspaces/${encode(workspaceId)}/time-entries/${encode(id)}`,
      { query: { hydrated: true } },
    );
  }

  async createTimeEntry(
    workspaceId: string,
    body: CreateTimeEntryBody,
  ): Promise<RawTimeEntry> {
    return this.request<RawTimeEntry>(
      `/workspaces/${encode(workspaceId)}/time-entries`,
      { method: "POST", body },
    );
  }

  async updateTimeEntry(
    workspaceId: string,
    id: string,
    body: UpdateTimeEntryBody,
  ): Promise<RawTimeEntry> {
    return this.request<RawTimeEntry>(
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

  async listProjects(
    workspaceId: string,
    q: ListProjectsQuery = {},
  ): Promise<RawProject[]> {
    return this.request<RawProject[]>(
      `/workspaces/${encode(workspaceId)}/projects`,
      {
        query: {
          name: q.name,
          clients: q.clientIds?.join(","),
          archived: q.archived,
          page: q.page,
          "page-size": q.pageSize,
        },
      },
    );
  }

  async getProject(workspaceId: string, id: string): Promise<RawProject> {
    return this.request<RawProject>(
      `/workspaces/${encode(workspaceId)}/projects/${encode(id)}`,
    );
  }

  async createProject(
    workspaceId: string,
    body: CreateProjectBody,
  ): Promise<RawProject> {
    return this.request<RawProject>(
      `/workspaces/${encode(workspaceId)}/projects`,
      { method: "POST", body },
    );
  }

  async updateProject(
    workspaceId: string,
    id: string,
    body: UpdateProjectBody,
  ): Promise<RawProject> {
    return this.request<RawProject>(
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

  async archiveProject(workspaceId: string, id: string): Promise<RawProject> {
    return this.request<RawProject>(
      `/workspaces/${encode(workspaceId)}/projects/${encode(id)}`,
      { method: "PATCH", body: { archived: true } },
    );
  }

  async listTasks(
    workspaceId: string,
    projectId: string,
    q: { name?: string; page?: number; pageSize?: number } = {},
  ): Promise<RawTask[]> {
    return this.request<RawTask[]>(
      `/workspaces/${encode(workspaceId)}/projects/${encode(projectId)}/tasks`,
      { query: { name: q.name, page: q.page, "page-size": q.pageSize } },
    );
  }

  async createTask(
    workspaceId: string,
    projectId: string,
    body: CreateTaskBody,
  ): Promise<RawTask> {
    return this.request<RawTask>(
      `/workspaces/${encode(workspaceId)}/projects/${encode(projectId)}/tasks`,
      { method: "POST", body },
    );
  }

  async updateTask(
    workspaceId: string,
    projectId: string,
    id: string,
    body: UpdateTaskBody,
  ): Promise<RawTask> {
    return this.request<RawTask>(
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

  async listTags(
    workspaceId: string,
    q: { name?: string; archived?: boolean; page?: number; pageSize?: number } = {},
  ): Promise<RawTag[]> {
    return this.request<RawTag[]>(
      `/workspaces/${encode(workspaceId)}/tags`,
      { query: { name: q.name, archived: q.archived, page: q.page, "page-size": q.pageSize } },
    );
  }

  async createTag(workspaceId: string, body: CreateTagBody): Promise<RawTag> {
    return this.request<RawTag>(
      `/workspaces/${encode(workspaceId)}/tags`,
      { method: "POST", body },
    );
  }

  async updateTag(workspaceId: string, id: string, body: UpdateTagBody): Promise<RawTag> {
    return this.request<RawTag>(
      `/workspaces/${encode(workspaceId)}/tags/${encode(id)}`,
      { method: "PUT", body },
    );
  }

  async deleteTag(workspaceId: string, id: string): Promise<void> {
    await this.request<void>(
      `/workspaces/${encode(workspaceId)}/tags/${encode(id)}`,
      { method: "DELETE" },
    );
  }

  async stopRunningTimer(
    workspaceId: string,
    userId: string,
    end: string,
  ): Promise<RawTimeEntry> {
    return this.request<RawTimeEntry>(
      `/workspaces/${encode(workspaceId)}/user/${encode(userId)}/time-entries`,
      { method: "PATCH", body: { end } },
    );
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

function encode(segment: string): string {
  if (!segment || segment.includes("/") || segment.includes("?") || segment.includes("#")) {
    throw new Error(`Invalid path segment: ${JSON.stringify(segment)}`);
  }
  return encodeURIComponent(segment);
}
