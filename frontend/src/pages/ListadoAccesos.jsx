import { useEffect, useRef, useState } from 'react';
import { Paper, Title, Group, TextInput, Button, Table, Badge, Text, Pagination } from '@mantine/core';
import { api } from '../api/client';

export default function ListadoAccesos() {
  const [filtros, setFiltros] = useState({ base: '', usuario: '', objeto: '' });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* Este listado NO lee SQL Server en vivo: muestra la foto guardada en
     ZeusPermisos, que se arma con usp_ZeusPermisos_Cargar. Si aplicaste un
     script recien, hasta que no se refresque no vas a verlo aca. */
  const [estadoCarga, setEstadoCarga] = useState(null);
  const [refrescando, setRefrescando] = useState(false);
  const pollRef = useRef(null);

  const pageSize = 20;

  async function buscar(p = 1) {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/permisos', { ...filtros, page: p, page_size: pageSize });
      setItems(data.items);
      setTotal(data.total);
      setPage(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function traerEstado() {
    try {
      const data = await api.get('/permisos/estado-carga');
      setEstadoCarga(data);
      return data;
    } catch {
      return null;
    }
  }

  async function refrescar() {
    setError('');
    setRefrescando(true);

    const antes = estadoCarga?.fecha_ultima_carga ?? null;

    try {
      await api.post('/permisos/refrescar', {});
    } catch (err) {
      setError(err.message);
      setRefrescando(false);
      return;
    }

    /* La carga corre en background y recorre todas las bases: puede tardar
       varios minutos. Se hace poll hasta que cambie la fecha de la foto. */
    let intentos = 0;
    pollRef.current = setInterval(async () => {
      intentos += 1;
      const estado = await traerEstado();

      const listo = estado?.fecha_ultima_carga && estado.fecha_ultima_carga !== antes;

      if (listo || intentos > 120) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setRefrescando(false);
        if (listo) {
          buscar(1);
        } else {
          setError('La recarga esta tardando mas de lo normal. Volvé a consultar en unos minutos.');
        }
      }
    }, 5000);
  }

  useEffect(() => {
    buscar(1);
    traerEstado();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fechaFoto = estadoCarga?.fecha_ultima_carga
    ? new Date(estadoCarga.fecha_ultima_carga).toLocaleString()
    : null;

  return (
    <Paper withBorder p="lg">
      <Group justify="space-between" mb="md" align="start">
        <div>
          <Title order={4}>Listado de accesos</Title>
          <Text size="sm" c="dimmed">
            {fechaFoto
              ? `Datos al ${fechaFoto} · ${estadoCarga.filas} permisos en ${estadoCarga.bases} bases`
              : 'Sin datos cargados todavia.'}
          </Text>
        </div>
        <Button variant="light" onClick={refrescar} loading={refrescando}>
          {refrescando ? 'Actualizando…' : 'Actualizar datos'}
        </Button>
      </Group>

      <Group mb="md" align="end">
        <TextInput
          label="Usuario"
          placeholder="ej: jperez"
          value={filtros.usuario}
          onChange={(e) => setFiltros({ ...filtros, usuario: e.currentTarget.value })}
        />
        <TextInput
          label="Base de datos"
          placeholder="ej: Desarrollo"
          value={filtros.base}
          onChange={(e) => setFiltros({ ...filtros, base: e.currentTarget.value })}
        />
        <TextInput
          label="Objeto"
          placeholder="ej: Clientes"
          value={filtros.objeto}
          onChange={(e) => setFiltros({ ...filtros, objeto: e.currentTarget.value })}
        />
        <Button onClick={() => buscar(1)} loading={loading}>
          Buscar
        </Button>
      </Group>

      {refrescando && (
        <Text size="sm" c="dimmed" mb="sm">
          Recorriendo todas las bases. Podés seguir usando la pantalla; los datos se actualizan al terminar.
        </Text>
      )}

      {error && (
        <Text c="red" size="sm" mb="sm">
          {error}
        </Text>
      )}

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Usuario</Table.Th>
            <Table.Th>Base de datos</Table.Th>
            <Table.Th>Objeto</Table.Th>
            <Table.Th>Rol</Table.Th>
            <Table.Th>Origen</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed" ta="center" fs="italic" py="md">
                  Sin resultados.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {items.map((it) => (
            <Table.Tr key={it.id}>
              <Table.Td>{it.usuario}</Table.Td>
              <Table.Td>{it.base}</Table.Td>
              <Table.Td>{it.esquema ? `${it.esquema}.${it.objeto}` : it.objeto || '-'}</Table.Td>
              <Table.Td>
                <Badge color={it.rol?.includes('writer') || it.rol?.includes('owner') ? 'teal' : 'blue'} variant="light">
                  {it.rol || '-'}
                </Badge>
              </Table.Td>
              <Table.Td>{it.origen}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Group justify="center" mt="md">
        <Pagination total={Math.ceil(total / pageSize) || 1} value={page} onChange={buscar} />
      </Group>
    </Paper>
  );
}
