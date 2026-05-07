import type { CSSProperties, ReactNode } from 'react';

export type IconName =
  | 'search'
  | 'plus'
  | 'check'
  | 'x'
  | 'chev-down'
  | 'chev-right'
  | 'chev-left'
  | 'lock'
  | 'filter'
  | 'clock'
  | 'user'
  | 'users'
  | 'tag'
  | 'folder'
  | 'archive'
  | 'dashboard'
  | 'board'
  | 'list'
  | 'dots'
  | 'bell'
  | 'comment'
  | 'edit'
  | 'trash'
  | 'arrow-right'
  | 'eye'
  | 'info'
  | 'at'
  | 'sparkle';

export type IconProps = {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
};

const ICONS: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M4 12l5 5L20 6" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  'chev-down': <path d="M6 9l6 6 6-6" />,
  'chev-right': <path d="M9 6l6 6-6 6" />,
  'chev-left': <path d="M15 6l-6 6 6 6" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  filter: <path d="M4 5h16l-6 8v6l-4-2v-4L4 5z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c1.2-3.6 4-4.8 6.5-4.8s5.3 1.2 6.5 4.8" />
      <circle cx="17" cy="9" r="2.8" />
      <path d="M17 14.5c2 0 4 .8 4.8 3.5" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V4h8l10 10-8 8L3 12z" />
      <circle cx="8" cy="8" r="1.3" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
  archive: (
    <>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8M10 12h4" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  board: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1" />
      <rect x="10" y="4" width="5" height="11" rx="1" />
      <rect x="17" y="4" width="4" height="8" rx="1" />
    </>
  ),
  list: <path d="M4 6h16M4 12h16M4 18h16" />,
  dots: (
    <>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </>
  ),
  bell: <path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15L6 16zM10 20a2 2 0 004 0" />,
  comment: <path d="M4 5h16v11H9l-5 4V5z" />,
  edit: <path d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </>
  ),
  at: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 12v2a2 2 0 004 0v-2a8 8 0 10-3 6.2" />
    </>
  ),
  sparkle: (
    <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5zM19 14l.8 2 2 .8-2 .8L19 20l-.8-1.4-2-.8 2-.8.8-2z" />
  ),
};

export function Icon({
  name,
  size = 16,
  stroke = 1.6,
  className,
  style,
  'aria-label': ariaLabel,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {ICONS[name]}
    </svg>
  );
}
