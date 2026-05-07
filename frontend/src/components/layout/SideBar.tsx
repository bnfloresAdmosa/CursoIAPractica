import type { Project, ProjectId, ProjectRole, User } from '@/lib/types';
import { Avatar } from '../ui/Avatar';
import { Icon, type IconName } from '../ui/Icon';

export type SideBarView = 'projects' | 'dashboard' | 'archived';

export type SideBarProps = {
  projects: Project[];
  activeProjectId?: ProjectId;
  activeView?: SideBarView;
  currentUser: User;
  currentRole?: ProjectRole;
  currentProjectName?: string;
  onSelectView?: (view: SideBarView) => void;
  onSelectProject?: (id: ProjectId) => void;
};

const PROJECT_PALETTE = [
  '#0071e3',
  '#c68415',
  '#3d8b7a',
  '#8a6a9a',
  '#a85c6b',
  '#5b6f9a',
  '#6a7a5b',
];

function projectMarkerColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PROJECT_PALETTE[h % PROJECT_PALETTE.length] ?? '#0071e3';
}

const VIEWS: Array<{ key: SideBarView; label: string; icon: IconName }> = [
  { key: 'projects', label: 'Proyectos', icon: 'folder' },
  { key: 'dashboard', label: 'Métricas', icon: 'dashboard' },
  { key: 'archived', label: 'Archivados', icon: 'archive' },
];

export function SideBar({
  projects,
  activeProjectId,
  activeView,
  currentUser,
  currentRole,
  currentProjectName,
  onSelectView,
  onSelectProject,
}: SideBarProps) {
  const visibleProjects = projects.filter((p) => !p.archived);
  return (
    <div className="sidebar">
      <div>
        <div className="group-label">Espacio</div>
        {VIEWS.map((v) => (
          <div
            key={v.key}
            className={`nav-item ${activeView === v.key ? 'active' : ''}`}
            onClick={onSelectView ? () => onSelectView(v.key) : undefined}
          >
            <span className="nav-icon">
              <Icon name={v.icon} size={15} />
            </span>
            {v.label}
          </div>
        ))}
      </div>

      <div>
        <div className="group-label">Proyectos</div>
        {visibleProjects.map((p) => (
          <div
            key={p.id}
            className={`nav-item ${activeProjectId === p.id ? 'active' : ''}`}
            onClick={onSelectProject ? () => onSelectProject(p.id) : undefined}
          >
            <span
              className="nav-icon"
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: projectMarkerColor(p.id),
              }}
            />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </span>
            <span className="count">{p.open}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', padding: 10, fontSize: 11, color: 'var(--subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar name={currentUser.name} size="sm" />
          <div>
            <div style={{ color: 'var(--text)', fontWeight: 500, fontSize: 12 }}>
              {currentUser.name}
            </div>
            {currentRole && currentProjectName && (
              <div>
                {currentRole === 'ADMIN' ? 'Admin' : 'Usuario'} · {currentProjectName}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
