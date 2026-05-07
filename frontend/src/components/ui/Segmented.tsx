import type { ReactNode } from 'react';

export type SegmentedOption<V extends string = string> = {
  value: V;
  label: string;
  icon?: ReactNode;
};

export type SegmentedProps<V extends string = string> = {
  value: V;
  onChange: (value: V) => void;
  options: SegmentedOption<V>[];
};

export function Segmented<V extends string = string>({
  value,
  onChange,
  options,
}: SegmentedProps<V>) {
  return (
    <div
      className="nav"
      style={{
        display: 'flex',
        background: 'var(--surface-2)',
        padding: 3,
        borderRadius: 'var(--r-sm)',
        gap: 2,
      }}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={active ? 'active' : ''}
            style={{
              border: 'none',
              background: active ? 'var(--surface)' : 'transparent',
              padding: '5px 12px',
              fontSize: 12.5,
              fontWeight: 500,
              color: active ? 'var(--text)' : 'var(--muted)',
              borderRadius: 5,
              boxShadow: active ? 'var(--shadow-1)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
