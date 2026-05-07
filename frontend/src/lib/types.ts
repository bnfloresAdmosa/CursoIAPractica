// Tipos derivados del PRD (Base-Specs/specs.md §2 y §5).
// Estado y prioridad usan los códigos del prototipo (todo/progress/done, high/med/low);
// el mapping a las etiquetas en español del PRD ("Por hacer" / "En progreso" / "Listo")
// vive en la capa de presentación cuando haga falta.

export type UserId = string;
export type ProjectId = string;
export type TicketId = string;
export type TagId = string;

export type ProjectRole = 'ADMIN' | 'USER';
export type TicketStatus = 'todo' | 'progress' | 'done';
export type TicketPriority = 'high' | 'med' | 'low';

export interface User {
  id: UserId;
  name: string;
  handle: string;
  email: string;
}

export interface Project {
  id: ProjectId;
  name: string;
  desc: string;
  members: number;
  open: number;
  archived: boolean;
  role: ProjectRole;
  lastActivity: string;
}

export interface Tag {
  id: TagId;
  name: string;
  color: string;
}

export interface Ticket {
  id: TicketId;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignees: UserId[];
  tags: TagId[];
  comments: number;
  updated: string;
}
