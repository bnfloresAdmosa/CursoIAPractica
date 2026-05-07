import type { TicketPriority } from '@/lib/types';

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  high: 'Alta',
  med: 'Media',
  low: 'Baja',
};

export type PriorityChipProps = {
  priority: TicketPriority;
};

export function PriorityChip({ priority }: PriorityChipProps) {
  return (
    <span className={`chip ${priority}`}>
      <span className={`dot ${priority}`} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
