import { Avatar, type AvatarSize } from './Avatar';

export type AvatarStackProps = {
  names: string[];
  size?: AvatarSize;
  max?: number;
};

export function AvatarStack({ names, size = 'md', max = 3 }: AvatarStackProps) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  const sizeClass = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : '';
  return (
    <div className="avatar-stack">
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} />
      ))}
      {rest > 0 && (
        <div
          className={['avatar', sizeClass].filter(Boolean).join(' ')}
          style={{ background: '#c7c7cc', color: '#1d1d1f' }}
          title={`${rest} más`}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
