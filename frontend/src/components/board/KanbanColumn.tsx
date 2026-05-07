import { useDroppable } from '@dnd-kit/core';
import type { Tag, Ticket, TicketId, TicketStatus, User } from '@/lib/types';
import { TicketCard } from '../ui/TicketCard';
import { Btn } from '../ui/Btn';
import { Icon } from '../ui/Icon';

export type KanbanColumnProps = {
  status: TicketStatus;
  label: string;
  tickets: Ticket[];
  tagsById?: Map<string, Tag>;
  usersById?: Map<string, User>;
  count?: number;
  onAddTicket?: () => void;
  onTicketClick?: (id: TicketId) => void;
};

export function KanbanColumn({
  status,
  label,
  tickets,
  tagsById,
  usersById,
  count,
  onAddTicket,
  onTicketClick,
}: KanbanColumnProps) {
  const totalCount = count ?? tickets.length;
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        minWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        background: isOver ? 'var(--surface-2)' : 'transparent',
        borderRadius: 'var(--r-lg)',
        transition: 'background 0.12s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px 10px',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '-0.01em',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`dot ${status}`} style={{ width: 8, height: 8 }} />
          {label}
          <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 12 }}>
            {totalCount}
          </span>
        </div>
        <Btn
          variant="ghost"
          size="icon"
          onClick={onAddTicket}
          title={`Agregar a ${label}`}
          aria-label={`Agregar ticket a ${label}`}
          style={{ width: 22, height: 22 }}
        >
          <Icon name="plus" size={13} />
        </Btn>
      </div>
      <div
        className="mj-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {tickets.map((t) => (
          <TicketCard
            key={t.id}
            ticket={t}
            tagsById={tagsById}
            usersById={usersById}
            onClick={onTicketClick}
          />
        ))}
      </div>
    </div>
  );
}
