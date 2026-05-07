import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type FilterPillProps = {
  icon?: ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
  onRemove?: () => void;
};

export function FilterPill({ icon, label, value, onClick, onRemove }: FilterPillProps) {
  return (
    <span
      className="chip"
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '4px 10px',
        cursor: onClick ? 'pointer' : 'default',
        gap: 6,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {icon && <span style={{ color: 'var(--muted)', display: 'inline-flex' }}>{icon}</span>}
      <span style={{ color: 'var(--muted)' }}>{label}:</span>
      <span>{value}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Quitar filtro ${label}`}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            display: 'inline-flex',
            color: 'var(--muted)',
            cursor: 'pointer',
          }}
        >
          <Icon name="x" size={11} />
        </button>
      ) : (
        <Icon name="chev-down" size={11} style={{ color: 'var(--muted)' }} />
      )}
    </span>
  );
}
