import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROJECTS, USERS } from '@/lib/mock-data';
import type { Tag, User } from '@/lib/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { TopBar } from '@/components/layout/TopBar';
import { SideBar } from '@/components/layout/SideBar';
import { Badge } from '@/components/ui/Badge';
import { Btn } from '@/components/ui/Btn';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { BoardFilters } from '@/features/board/BoardFilters';
import { EmptyBoard } from '@/features/board/EmptyBoard';
import { applyFilters } from '@/features/board/filters';
import { useBoardFilters } from '@/features/board/useBoardFilters';
import { useMoveTicket, useTickets } from '@/features/board/board-hooks';
import { useAuth } from '@/features/auth/useAuth';

export function BoardScreen() {
  const { currentUser: authUser, logout } = useAuth();
  const currentUser: User = authUser
    ? {
        id: String(authUser.id),
        name: authUser.name,
        email: authUser.email,
        handle: authUser.email.split('@')[0] ?? '',
      }
    : USERS[0]!;
  const currentProject = PROJECTS[0]!;
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const { data, isLoading, isError, error } = useTickets();
  const moveTicket = useMoveTicket();

  const usersById = useMemo(() => {
    const m = new Map<string, User>();
    for (const [id, u] of Object.entries(data?.users ?? {})) m.set(id, u);
    return m;
  }, [data?.users]);

  const tagsById = useMemo(() => {
    const m = new Map<string, Tag>();
    for (const [id, t] of Object.entries(data?.tags ?? {})) m.set(id, t);
    return m;
  }, [data?.tags]);

  const allTickets = data?.tickets ?? [];

  const { filters, clearAll } = useBoardFilters();

  const filtered = useMemo(() => applyFilters(allTickets, filters), [allTickets, filters]);
  const todoFiltered = useMemo(() => filtered.filter((t) => t.status === 'todo'), [filtered]);
  const progressFiltered = useMemo(
    () => filtered.filter((t) => t.status === 'progress'),
    [filtered],
  );
  const doneFiltered = useMemo(() => filtered.filter((t) => t.status === 'done'), [filtered]);

  const totalFiltered = filtered.length;
  const isEmpty = !isLoading && !isError && totalFiltered === 0;

  return (
    <AppLayout
      topbar={
        <TopBar
          breadcrumbs={['Espacio', currentProject.name]}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      }
      sidebar={
        <SideBar
          projects={PROJECTS}
          activeProjectId={currentProject.id}
          activeView="projects"
          currentUser={currentUser}
          currentRole={currentProject.role}
          currentProjectName={currentProject.name}
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
            <h1>{currentProject.name}</h1>
            <div className="sub" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>{currentProject.desc}</span>
              {currentProject.role === 'ADMIN' && <Badge tone="inverse">Admin</Badge>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Segmented
              value="board"
              onChange={() => {}}
              options={[
                {
                  value: 'board',
                  label: 'Tablero',
                  icon: <Icon name="board" size={12} style={{ marginRight: 4 }} />,
                },
                {
                  value: 'list',
                  label: 'Lista',
                  icon: <Icon name="list" size={12} style={{ marginRight: 4 }} />,
                },
                {
                  value: 'metrics',
                  label: 'Métricas',
                  icon: <Icon name="dashboard" size={12} style={{ marginRight: 4 }} />,
                },
              ]}
            />
            <Btn variant="primary" leftIcon={<Icon name="plus" size={14} />}>
              Nuevo ticket
            </Btn>
          </div>
        </div>

        <BoardFilters totalResults={totalFiltered} tagsById={tagsById} usersById={usersById} />
      </div>

      {isLoading && (
        <div
          style={{
            flex: 1,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--muted)',
            fontSize: 13,
          }}
        >
          Cargando tickets…
        </div>
      )}

      {isError && (
        <div
          style={{
            flex: 1,
            display: 'grid',
            placeItems: 'center',
            color: 'var(--p-high)',
            fontSize: 13,
            padding: 24,
            textAlign: 'center',
          }}
        >
          Error al cargar tickets: {error instanceof Error ? error.message : 'desconocido'}
        </div>
      )}

      {!isLoading && !isError && isEmpty && <EmptyBoard onClear={clearAll} />}

      {!isLoading && !isError && !isEmpty && (
        <KanbanBoard
          todo={todoFiltered}
          progress={progressFiltered}
          done={doneFiltered}
          tagsById={tagsById}
          usersById={usersById}
          onMoveTicket={(id, newStatus) => moveTicket.mutate({ id, newStatus })}
        />
      )}
    </AppLayout>
  );
}
