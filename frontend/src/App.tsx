import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from './components/ui/Shell';
import { MatrixPage } from './pages/MatrixPage';
import { RolesPage } from './pages/RolesPage';
import { OrganigrammePage } from './pages/OrganigrammePage';
import { useMatrixStore } from './store/useMatrixStore';

export default function App() {
  const init = useMatrixStore((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);

  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<MatrixPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/organigramme" element={<OrganigrammePage />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
