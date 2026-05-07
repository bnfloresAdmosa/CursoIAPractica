import type { CSSProperties } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';

export type AvatarProps = {
  name: string;
  size?: AvatarSize;
  className?: string;
  style?: CSSProperties;
};

function hashToPalette(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return `c${(h % 7) + 1}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

export function Avatar({ name, size = 'md', className, style }: AvatarProps) {
  if (!name) return null;
  const sizeClass = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : '';
  const palette = hashToPalette(name);
  return (
    <div
      className={['avatar', palette, sizeClass, className].filter(Boolean).join(' ')}
      style={style}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
