import type { CSSProperties, ReactNode } from 'react';

export type BtnVariant = 'default' | 'primary' | 'ghost' | 'danger';
export type BtnSize = 'md' | 'sm' | 'icon';

export type BtnProps = {
  children?: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  leftIcon?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
};

export function Btn({
  children,
  variant = 'default',
  size = 'md',
  leftIcon,
  type = 'button',
  onClick,
  disabled,
  title,
  className,
  style,
  'aria-label': ariaLabel,
}: BtnProps) {
  const classes = [
    'btn',
    variant !== 'default' ? variant : '',
    size !== 'md' ? size : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={style}
      aria-label={ariaLabel}
    >
      {leftIcon}
      {children}
    </button>
  );
}
