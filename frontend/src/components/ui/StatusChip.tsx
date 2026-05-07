import type { TicketStatus } from '@/lib/types';

const STATUS_LABEL: Record<TicketStatus, string> = {
  todo: 'Por hacer',
  progress: 'En progreso',
  done: 'Listo',
};

export type StatusChipProps = {
  status: TicketStatus;
};

export function StatusChip({ status }: StatusChipProps) {
  return (
    <span className={`chip ${status}`}>
      <span className={`dot ${status}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}
