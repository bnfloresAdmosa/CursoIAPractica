import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { Tag, Ticket, TicketId, TicketStatus, User } from '@/lib/types';
import { TicketCard } from '../ui/TicketCard';
import { KanbanColumn } from './KanbanColumn';

const VALID_STATUSES: readonly TicketStatus[] = ['todo', 'progress', 'done'];

export type KanbanBoardProps = {
  todo: Ticket[];
  progress: Ticket[];
  done: Ticket[];
  tagsById?: Map<string, Tag>;
  usersById?: Map<string, User>;
  onTicketClick?: (id: TicketId) => void;
  onAddTicket?: () => void;
  /** Llamado tras drop válido (drop sobre una columna distinta a la actual). */
  onMoveTicket?: (id: TicketId, newStatus: TicketStatus) => void;
};

export function KanbanBoard({
  todo,
  progress,
  done,
  tagsById,
  usersById,
  onTicketClick,
  onAddTicket,
  onMoveTicket,
}: KanbanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const [activeId, setActiveId] = useState<TicketId | null>(null);

  const activeTicket = useMemo(() => {
    if (!activeId) return null;
    return [...todo, ...progress, ...done].find((t) => t.id === activeId) ?? null;
  }, [activeId, todo, progress, done]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !onMoveTicket) return;
    const newStatus = String(over.id) as TicketStatus;
    if (!VALID_STATUSES.includes(newStatus)) return;
    const ticketId = String(active.id);
    const sourceTicket =
      todo.find((t) => t.id === ticketId) ??
      progress.find((t) => t.id === ticketId) ??
      done.find((t) => t.id === ticketId);
    // No-op si soltó en la misma columna
    if (sourceTicket && sourceTicket.status === newStatus) return;
    onMoveTicket(ticketId, newStatus);
  };

  const handleDragCancel = () => setActiveId(null);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          padding: '20px 20px',
          display: 'flex',
          gap: 16,
        }}
      >
        <KanbanColumn
          status="todo"
          label="Por hacer"
          tickets={todo}
          tagsById={tagsById}
          usersById={usersById}
          onAddTicket={onAddTicket}
          onTicketClick={onTicketClick}
        />
        <KanbanColumn
          status="progress"
          label="En progreso"
          tickets={progress}
          tagsById={tagsById}
          usersById={usersById}
          onAddTicket={onAddTicket}
          onTicketClick={onTicketClick}
        />
        <KanbanColumn
          status="done"
          label="Listo"
          tickets={done}
          tagsById={tagsById}
          usersById={usersById}
          onAddTicket={onAddTicket}
          onTicketClick={onTicketClick}
        />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTicket ? (
          <TicketCard
            ticket={activeTicket}
            tagsById={tagsById}
            usersById={usersById}
            draggable={false}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
