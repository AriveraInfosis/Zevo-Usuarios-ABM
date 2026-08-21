import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Group, Text, Badge, Button, Tabs, Box, Container } from '@mantine/core';
import { useAuth } from '../context/AuthContext';

const TAB_ROUTES = {
  listado: '/',
  nueva: '/solicitudes/nueva',
  mias: '/solicitudes/mias',
  pendientes: '/solicitudes/pendientes',
  auditoria: '/auditoria',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  let activeTab = 'listado';
  if (location.pathname === '/solicitudes/nueva') activeTab = 'nueva';
  else if (location.pathname === '/solicitudes/mias') activeTab = 'mias';
  else if (location.pathname === '/solicitudes/pendientes') activeTab = 'pendientes';
  else if (location.pathname === '/auditoria') activeTab = 'auditoria';

  return (
    <Box style={{ minHeight: '100vh', background: '#fafafa' }}>
      <Box style={{ borderBottom: '2px solid #d5d5d5', background: '#fff' }} px="lg" py="sm">
        <Group justify="space-between">
          <Text fw={700} size="lg">Gestion de Accesos a Base de Datos</Text>
          <Group gap="sm">
            <Text size="sm">
              Sesion: <b>{user?.email}</b>
            </Text>
            <Badge variant="outline" color={user?.es_dba ? 'grape' : 'gray'}>
              {user?.es_dba ? 'DBA' : 'Solicitante'}
            </Badge>
            <Button variant="default" size="xs" onClick={handleLogout}>
              Salir
            </Button>
          </Group>
        </Group>
      </Box>

      <Container size="lg" pt="md">
        <Tabs value={activeTab} onChange={(v) => navigate(TAB_ROUTES[v])}>
          <Tabs.List>
            <Tabs.Tab value="listado">Listado de accesos</Tabs.Tab>
            <Tabs.Tab value="nueva">Nueva solicitud</Tabs.Tab>
            <Tabs.Tab value="mias">Mis solicitudes</Tabs.Tab>
            {user?.es_dba && <Tabs.Tab value="pendientes">Bandeja DBA</Tabs.Tab>}
            {user?.es_dba && <Tabs.Tab value="auditoria">Auditoria</Tabs.Tab>}
          </Tabs.List>
        </Tabs>

        <Box py="lg">
          <Outlet />
        </Box>
      </Container>
    </Box>
  );
}
