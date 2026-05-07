import { Route, Routes } from 'react-router-dom';
import { ProjectsScreen } from '@/features/projects/ProjectsScreen';
import { BoardScreen } from '@/features/board/BoardScreen';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { RequireAuth } from '@/features/auth/RequireAuth';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <ProjectsScreen />
          </RequireAuth>
        }
      />
      <Route
        path="/board"
        element={
          <RequireAuth>
            <BoardScreen />
          </RequireAuth>
        }
      />
      <Route
        path="/board/:projectId"
        element={
          <RequireAuth>
            <BoardScreen />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
