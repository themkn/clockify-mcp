export interface ClockifyUser {
  id: string;
  email: string;
  name: string;
  activeWorkspace: string;
  defaultWorkspace: string;
}

export interface RawTimeEntry {
  id: string;
  description?: string;
  timeInterval?: { start?: string; end?: string | null; duration?: string | null };
  projectId?: string | null;
  project?: { id?: string; name?: string } | null;
  taskId?: string | null;
  tagIds?: string[] | null;
  billable?: boolean;
}

export interface CreateTimeEntryBody {
  start: string;
  end?: string;
  description?: string;
  projectId?: string;
  taskId?: string;
  tagIds?: string[];
  billable?: boolean;
}

export type UpdateTimeEntryBody = Partial<CreateTimeEntryBody>;

export interface ListTimeEntriesQuery {
  start?: string;
  end?: string;
  project?: string;
  description?: string;
  inProgress?: boolean;
  page?: number;
  pageSize?: number;
}

export interface RawProject {
  id: string;
  name: string;
  clientId?: string | null;
  clientName?: string | null;
  archived?: boolean;
  billable?: boolean;
  color?: string | null;
  note?: string | null;
}

export interface CreateProjectBody {
  name: string;
  clientId?: string;
  color?: string;
  billable?: boolean;
  isPublic?: boolean;
  note?: string;
}

export type UpdateProjectBody = Partial<CreateProjectBody>;

export interface ListProjectsQuery {
  name?: string;
  clientIds?: string[];
  archived?: boolean;
  page?: number;
  pageSize?: number;
}

export interface RawTask {
  id: string;
  name: string;
  projectId: string;
  status?: string;
  assigneeIds?: string[];
  estimate?: string | null;
}

export interface CreateTaskBody {
  name: string;
  assigneeIds?: string[];
  estimate?: string;
  status?: "ACTIVE" | "DONE";
}

export type UpdateTaskBody = Partial<CreateTaskBody>;
