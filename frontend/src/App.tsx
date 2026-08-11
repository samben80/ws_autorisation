import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './components/ui/Shell';
import { MatrixPage } from './pages/MatrixPage';
import { RolesPage } from './pages/RolesPage';
import { OrganigrammePage } from './pages/OrganigrammePage';
import { SqlPage } from './pages/SqlPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { useMatrixStore } from './store/useMatrixStore';

export default function App() {
  const init = useMatrixStore((s) => s.init);
  const ready = useMatrixStore((s) => s.ready);
  const currentUserId = useMatrixStore((s) => s.currentUserId);
  const users = useMatrixStore((s) => s.users);

  useEffect(() => {
    init();
  }, [init]);

  if (!ready) return null;
  if (!currentUserId) return <LoginPage />;

  const isAdmin = users.find((u) => u.id === currentUserId)?.type === 'admin';

  return (
    <HashRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<MatrixPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/organigramme" element={<OrganigrammePage />} />
          <Route path="/sql" element={<SqlPage />} />
          <Route path="/admin" element={isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </HashRouter>
  );
}
