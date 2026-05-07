import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { USERS } from '@/lib/mock-data';
import type { ProjectId, User } from '@/lib/types';
import { useProjects } from '@/store/projectsStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { TopBar } from '@/components/layout/TopBar';
import { SideBar } from '@/components/layout/SideBar';
import { Btn } from '@/components/ui/Btn';
import { Icon } from '@/components/ui/Icon';
import { SearchBar } from '@/components/ui/SearchBar';
import { Segmented } from '@/components/ui/Segmented';
import { ProjectCard } from '@/components/ui/ProjectCard';
import { NewProjectCard } from './NewProjectCard';
import { useAuth } from '@/features/auth/useAuth';

type ProjectsTab = 'active' | 'archived';

export function ProjectsScreen() {
  const { currentUser: authUser, logout } = useAuth();
  // RequireAuth garantiza authUser != null en este punto.
  const currentUser: User = authUser
    ? {
        id: String(authUser.id),
        name: authUser.name,
        email: authUser.email,
        handle: authUser.email.split('@')[0] ?? '',
      }
    : USERS[0]!;
  const allProjects = useProjects();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const [tab, setTab] = useState<ProjectsTab>('active');
  const [query, setQuery] = useState('');

  const visibleProjects = useMemo(() => {
    const wantArchived = tab === 'archived';
    const q = query.trim().toLowerCase();
    return allProjects.filter((p) => {
      if (p.archived !== wantArchived) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allProjects, tab, query]);

  const handleProjectClick = (id: ProjectId) => {
    navigate(`/board/${id}`);
  };

  return (
    <AppLayout
      topbar={
        <TopBar
          breadcrumbs={['Espacio de trabajo', 'Proyectos']}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      }
      sidebar={
        <SideBar
          projects={allProjects}
          activeView="projects"
          currentUser={currentUser}
          onSelectProject={(id) => navigate(`/board/${id}`)}
          onSelectView={(view) => {
            if (view === 'projects') navigate('/');
          }}
        />
      }
    >
      <div className="page-head">
        <div className="head-row">
          <div>
            <h1>Proyectos</h1>
            <div className="sub">
              {visibleProjects.length}{' '}
              {tab === 'active' ? 'proyectos activos' : 'proyectos archivados'}
              {tab === 'active'
                ? ' · puedes ser Admin en unos y Usuario en otros.'
                : '.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Segmented
              value={tab}
              onChange={(v) => setTab(v as ProjectsTab)}
              options={[
                { value: 'active', label: 'Activos' },
                {
                  value: 'archived',
                  label: 'Archivados',
                  icon: <Icon name="archive" size={12} style={{ marginRight: 4 }} />,
                },
              ]}
            />
            <div style={{ marginLeft: 8 }}>
              <SearchBar
                placeholder="Buscar proyectos"
                width={220}
                value={query}
                onChange={setQuery}
              />
            </div>
            <Btn variant="primary" leftIcon={<Icon name="plus" size={14} />}>
              Nuevo proyecto
            </Btn>
          </div>
        </div>
      </div>

      <div
        className="mj-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {visibleProjects.map((p) => {
            const memberNames = USERS.slice(0, p.members).map((u) => u.name);
            return (
              <ProjectCard
                key={p.id}
                project={p}
                memberNames={memberNames}
                onClick={handleProjectClick}
              />
            );
          })}
          {tab === 'active' && <NewProjectCard />}
        </div>
      </div>
    </AppLayout>
  );
}
