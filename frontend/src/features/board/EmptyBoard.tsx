import { Btn } from '@/components/ui/Btn';
import { Icon } from '@/components/ui/Icon';

export type EmptyBoardProps = {
  onClear?: () => void;
};

export function EmptyBoard({ onClear }: EmptyBoardProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--surface-2)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 14px',
            color: 'var(--muted)',
          }}
        >
          <Icon name="search" size={20} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>
          No se encontraron tickets con estos filtros
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
          Prueba limpiar la búsqueda o eliminar uno de los filtros aplicados.
        </div>
        {onClear && (
          <Btn onClick={onClear} style={{ marginTop: 14 }}>
            Limpiar filtros
          </Btn>
        )}
      </div>
    </div>
  );
}
