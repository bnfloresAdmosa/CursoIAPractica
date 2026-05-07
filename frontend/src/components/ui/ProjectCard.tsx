import type { Project, ProjectId } from '@/lib/types';
import { AvatarStack } from './AvatarStack';
import { Icon } from './Icon';

const PROJECT_PALETTE = [
  '#0071e3',
  '#c68415',
  '#3d8b7a',
  '#8a6a9a',
  '#a85c6b',
  '#5b6f9a',
  '#6a7a5b',
];

function projectColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PROJECT_PALETTE[h % PROJECT_PALETTE.length] ?? '#0071e3';
}

function projectInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

export type ProjectCardProps = {
  project: Project;
  memberNames?: string[];
  onClick?: (id: ProjectId) => void;
};

export function ProjectCard({ project, memberNames, onClick }: ProjectCardProps) {
  const color = projectColor(project.id);

  return (
    <article
      className="card"
      role={onClick ? 'button' : undefined}
      onClick={onClick ? () => onClick(project.id) : undefined}
      style={{
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `${color}14`,
              color,
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '-0.02em',
            }}
          >
            {projectInitials(project.name)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>
              {project.name}
            </div>
            <div className="mono" style={{ fontSize: 10.5 }}>
              {project.id.toUpperCase()}
            </div>
          </div>
        </div>
        <span
          className="chip"
          style={{
            background: project.role === 'ADMIN' ? 'var(--text)' : 'var(--surface-2)',
            color: project.role === 'ADMIN' ? 'white' : 'var(--muted)',
            border: 'none',
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {project.role === 'ADMIN' ? 'Admin' : 'Usuario'}
        </span>
      </header>

      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: 'var(--muted)',
          lineHeight: 1.5,
          minHeight: 40,
        }}
      >
        {project.desc}
      </p>

      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          paddingTop: 14,
          borderTop: '1px solid var(--border)',
        }}
      >
        {memberNames && memberNames.length > 0 && (
          <AvatarStack names={memberNames} size="sm" max={4} />
        )}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 12,
            color: 'var(--muted)',
          }}
        >
          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <Icon name="board" size={12} /> {project.open} abiertos
          </span>
          <span>·</span>
          <span>{project.lastActivity}</span>
        </div>
      </footer>
    </article>
  );
}
