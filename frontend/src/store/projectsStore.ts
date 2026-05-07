import { create } from 'zustand';
import { PROJECTS } from '@/lib/mock-data';
import type { Project } from '@/lib/types';

type ProjectsState = {
  projects: Project[];
};

export const useProjectsStore = create<ProjectsState>(() => ({
  projects: PROJECTS,
}));

// ── Selectores ─────────────────────────────────────────────────────────────
// Devuelven la referencia estable del array completo. El consumidor filtra
// con useMemo cuando necesita por archived/active.
export const useProjects = (): Project[] => useProjectsStore((s) => s.projects);
