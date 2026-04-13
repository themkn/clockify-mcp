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
