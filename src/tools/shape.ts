interface RawTimeEntry {
  id: string;
  description?: string;
  timeInterval?: { start?: string; end?: string | null; duration?: string | null };
  projectId?: string | null;
  project?: { id?: string; name?: string } | null;
  taskId?: string | null;
  tagIds?: string[] | null;
  billable?: boolean;
}

export interface TimeEntrySummary {
  id: string;
  description: string;
  start: string | null;
  end: string | null;
  durationSeconds: number | null;
  projectId: string | null;
  projectName: string | null;
  taskId: string | null;
  tagIds: string[];
  billable: boolean;
}

export function shapeTimeEntry(e: RawTimeEntry): TimeEntrySummary {
  const start = e.timeInterval?.start ?? null;
  const end = e.timeInterval?.end ?? null;
  return {
    id: e.id,
    description: e.description ?? "",
    start,
    end,
    durationSeconds: computeDurationSeconds(start, end),
    projectId: e.projectId ?? e.project?.id ?? null,
    projectName: e.project?.name ?? null,
    taskId: e.taskId ?? null,
    tagIds: e.tagIds ?? [],
    billable: e.billable ?? false,
  };
}

function computeDurationSeconds(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const ms = Date.parse(end) - Date.parse(start);
  return Number.isFinite(ms) ? Math.round(ms / 1000) : null;
}

interface RawProject {
  id: string;
  name: string;
  clientId?: string | null;
  clientName?: string | null;
  archived?: boolean;
  billable?: boolean;
  color?: string | null;
  note?: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  archived: boolean;
  billable: boolean;
  color: string | null;
}

export function shapeProject(p: RawProject): ProjectSummary {
  return {
    id: p.id,
    name: p.name,
    clientId: p.clientId ?? null,
    clientName: p.clientName ?? null,
    archived: p.archived ?? false,
    billable: p.billable ?? false,
    color: p.color ?? null,
  };
}

interface RawTask {
  id: string;
  name: string;
  projectId: string;
  status?: string;
  assigneeIds?: string[];
  estimate?: string | null;
}

export interface TaskSummary {
  id: string;
  name: string;
  projectId: string;
  status: string | null;
  assigneeIds: string[];
  estimate: string | null;
}

export function shapeTask(t: RawTask): TaskSummary {
  return {
    id: t.id,
    name: t.name,
    projectId: t.projectId,
    status: t.status ?? null,
    assigneeIds: t.assigneeIds ?? [],
    estimate: t.estimate ?? null,
  };
}

interface RawTag {
  id: string;
  name: string;
  archived?: boolean;
}

export interface TagSummary {
  id: string;
  name: string;
  archived: boolean;
}

export function shapeTag(t: RawTag): TagSummary {
  return { id: t.id, name: t.name, archived: t.archived ?? false };
}

interface RawClient {
  id: string;
  name: string;
  archived?: boolean;
  note?: string | null;
}

export interface ClientSummary {
  id: string;
  name: string;
  archived: boolean;
  note: string | null;
}

export function shapeClient(c: RawClient): ClientSummary {
  return { id: c.id, name: c.name, archived: c.archived ?? false, note: c.note ?? null };
}
