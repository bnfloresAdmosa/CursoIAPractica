import type { Tag, Ticket, TicketPriority, TicketStatus, User } from '@/lib/types';

export type BoardFilters = {
  q: string;
  status: TicketStatus[];
  priority: TicketPriority[];
  tag: string[];
  assignee: string[];
};

export const EMPTY_FILTERS: BoardFilters = {
  q: '',
  status: [],
  priority: [],
  tag: [],
  assignee: [],
};

export function hasActiveFilters(f: BoardFilters): boolean {
  return (
    f.q.trim().length > 0 ||
    f.status.length > 0 ||
    f.priority.length > 0 ||
    f.tag.length > 0 ||
    f.assignee.length > 0
  );
}

export function applyFilters(tickets: Ticket[], f: BoardFilters): Ticket[] {
  const q = f.q.trim().toLowerCase();
  return tickets.filter((t) => {
    if (q && !t.title.toLowerCase().includes(q)) return false;
    if (f.status.length > 0 && !f.status.includes(t.status)) return false;
    if (f.priority.length > 0 && !f.priority.includes(t.priority)) return false;
    if (f.tag.length > 0 && !t.tags.some((id) => f.tag.includes(id))) return false;
    if (f.assignee.length > 0 && !t.assignees.some((id) => f.assignee.includes(id))) return false;
    return true;
  });
}

// ── Helpers de presentación de filtros activos ──

const STATUS_LABEL: Record<TicketStatus, string> = {
  todo: 'Por hacer',
  progress: 'En progreso',
  done: 'Listo',
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  high: 'Alta',
  med: 'Media',
  low: 'Baja',
};

export function formatStatusList(values: TicketStatus[]): string {
  if (values.length === 0) return '';
  if (values.length > 1) return `${values.length} estados`;
  const v = values[0]!;
  return STATUS_LABEL[v];
}

export function formatPriorityList(values: TicketPriority[]): string {
  if (values.length === 0) return '';
  if (values.length > 1) return `${values.length} prioridades`;
  const v = values[0]!;
  return PRIORITY_LABEL[v];
}

export function formatTagList(values: string[], tagsById: Map<string, Tag>): string {
  if (values.length === 0) return '';
  if (values.length > 1) return `${values.length} etiquetas`;
  const v = values[0]!;
  return tagsById.get(v)?.name ?? v;
}

export function formatAssigneeList(values: string[], usersById: Map<string, User>): string {
  if (values.length === 0) return '';
  if (values.length > 1) return `${values.length} personas`;
  const v = values[0]!;
  const user = usersById.get(v);
  return user?.name.split(' ')[0] ?? v;
}
