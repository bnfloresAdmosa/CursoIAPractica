import { Fragment, type ReactNode } from 'react';
import type { User } from '@/lib/types';
import { SearchBar } from '../ui/SearchBar';
import { Btn } from '../ui/Btn';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../ui/Icon';

export type TopBarProps = {
  breadcrumbs?: string[];
  currentUser: User;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  rightSlot?: ReactNode;
  /** Si se pasa, se muestra un botón "Cerrar sesión" antes del Avatar. */
  onLogout?: () => void;
};

export function TopBar({
  breadcrumbs,
  currentUser,
  searchValue,
  onSearchChange,
  rightSlot,
  onLogout,
}: TopBarProps) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">m</div>
        MiniJira
      </div>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="crumbs">
          {breadcrumbs.map((b, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <Fragment key={`${i}-${b}`}>
                {i > 0 && <span className="sep">/</span>}
                <span className={isLast ? 'current' : undefined}>{b}</span>
              </Fragment>
            );
          })}
        </div>
      )}
      <div className="spacer" />
      <SearchBar
        value={searchValue}
        onChange={onSearchChange}
        placeholder="Buscar tickets, proyectos…"
        width={260}
        shortcut="⌘K"
      />
      {rightSlot}
      <Btn variant="ghost" size="icon" title="Notificaciones" aria-label="Notificaciones">
        <Icon name="bell" size={15} />
      </Btn>
      <Avatar name={currentUser.name} />
      {onLogout && (
        <Btn
          variant="ghost"
          size="icon"
          onClick={onLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <Icon name="arrow-right" size={15} />
        </Btn>
      )}
    </div>
  );
}
