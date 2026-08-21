import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth, RequireDba } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import ListadoAccesos from './pages/ListadoAccesos';
import NuevaSolicitud from './pages/Solicitudes/Nueva';
import MisSolicitudes from './pages/Solicitudes/Mias';
import BandejaDBA from './pages/Solicitudes/Bandeja';
import Auditoria from './pages/Auditoria';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<ListadoAccesos />} />
            <Route path="/solicitudes/nueva" element={<NuevaSolicitud />} />
            <Route path="/solicitudes/mias" element={<MisSolicitudes />} />
            <Route
              path="/solicitudes/pendientes"
              element={
                <RequireDba>
                  <BandejaDBA />
                </RequireDba>
              }
            />
            <Route
              path="/auditoria"
              element={
                <RequireDba>
                  <Auditoria />
                </RequireDba>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
