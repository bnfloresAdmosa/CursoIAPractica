import type { ChangeEvent } from 'react';
import { Icon } from './Icon';

export type SearchBarProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  width?: number;
  shortcut?: string;
};

export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar…',
  width = 280,
  shortcut,
}: SearchBarProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };
  return (
    <div className="search">
      <Icon name="search" size={13} />
      <input
        className="input"
        placeholder={placeholder}
        value={value ?? ''}
        onChange={handleChange}
        style={{ width }}
      />
      {shortcut && (
        <span className="kbd" style={{ position: 'absolute', right: 8 }}>
          {shortcut}
        </span>
      )}
    </div>
  );
}
