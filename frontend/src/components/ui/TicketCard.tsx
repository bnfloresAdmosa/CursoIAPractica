import { useDraggable } from '@dnd-kit/core';
import type { Tag, Ticket, TicketId, User } from '@/lib/types';
import { PriorityChip } from './PriorityChip';
import { AvatarStack } from './AvatarStack';
import { Icon } from './Icon';

export type TicketCardProps = {
  ticket: Ticket;
  tagsById?: Map<string, Tag>;
  usersById?: Map<string, User>;
  onClick?: (id: TicketId) => void;
  /** Si false, no se registra como draggable (úsalo en DragOverlay para evitar id duplicado). */
  draggable?: boolean;
};

export function TicketCard({
  ticket,
  tagsById,
  usersById,
  onClick,
  draggable = true,
}: TicketCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.id,
    disabled: !draggable,
  });

  const assigneeNames = ticket.assignees
    .map((id) => usersById?.get(id)?.name)
    .filter((n): n is string => Boolean(n));

  const tags = ticket.tags
    .map((id) => tagsById?.get(id))
    .filter((t): t is Tag => Boolean(t));

  return (
    <article
      ref={draggable ? setNodeRef : undefined}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      className="card"
      onClick={onClick ? () => onClick(ticket.id) : undefined}
      style={{
        borderRadius: 12,
        padding: '12px 12px 10px',
        boxShadow: isDragging ? 'var(--shadow-3)' : 'var(--shadow-1)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : onClick ? 'pointer' : 'default',
        opacity: isDragging ? 0.4 : 1,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition: transform ? undefined : 'opacity 0.15s, box-shadow 0.15s',
        zIndex: isDragging ? 100 : undefined,
        touchAction: draggable ? 'none' : undefined,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span className="mono" style={{ fontSize: 10.5 }}>
          {ticket.id}
        </span>
        <PriorityChip priority={ticket.priority} />
      </header>

      <p
        style={{
          margin: 0,
          fontSize: 13.5,
          lineHeight: 1.4,
          fontWeight: 500,
          color: 'var(--text)',
          letterSpacing: '-0.01em',
        }}
      >
        {ticket.title}
      </p>

      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {tags.map((t) => (
            <span
              key={t.id}
              className="tag"
              style={{
                background: `${t.color}12`,
                color: t.color,
                borderColor: 'transparent',
              }}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 2,
        }}
      >
        {assigneeNames.length > 0 ? (
          <AvatarStack names={assigneeNames} size="sm" />
        ) : (
          <span style={{ color: 'var(--subtle)', fontSize: 11 }}>Sin asignar</span>
        )}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--muted)',
            fontSize: 11.5,
          }}
        >
          {ticket.comments > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Icon name="comment" size={11} /> {ticket.comments}
            </span>
          )}
          <span>{ticket.updated}</span>
        </div>
      </footer>
    </article>
  );
}
