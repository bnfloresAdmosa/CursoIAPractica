import type { CSSProperties, ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'inverse';

export type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  style?: CSSProperties;
};

export function Badge({ children, tone = 'neutral', className, style }: BadgeProps) {
  const inverseStyle: CSSProperties =
    tone === 'inverse' ? { background: 'var(--text)', color: 'white', border: 'none' } : {};
  return (
    <span
      className={['chip', className].filter(Boolean).join(' ')}
      style={{ ...inverseStyle, ...style }}
    >
      {children}
    </span>
  );
}
