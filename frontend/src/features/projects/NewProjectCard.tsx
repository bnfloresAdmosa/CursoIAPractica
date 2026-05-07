import { Icon } from '@/components/ui/Icon';

export type NewProjectCardProps = {
  onClick?: () => void;
};

export function NewProjectCard({ onClick }: NewProjectCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        border: '1.5px dashed var(--border-strong)',
        borderRadius: 'var(--r-lg)',
        padding: 20,
        minHeight: 168,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        color: 'var(--muted)',
        cursor: onClick ? 'pointer' : 'default',
        background: 'transparent',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--accent)',
        }}
      >
        <Icon name="plus" size={16} />
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>Nuevo proyecto</div>
      <div style={{ fontSize: 12 }}>Se asigna como Admin al creador</div>
    </div>
  );
}
