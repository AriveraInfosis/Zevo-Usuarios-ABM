import { useEffect, useState } from 'react';
import { Paper, Title, Group, TextInput, Button, Table, Badge, Text, Pagination } from '@mantine/core';
import { api } from '../api/client';

export default function ListadoAccesos() {
  const [filtros, setFiltros] = useState({ base: '', usuario: '', objeto: '' });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  useEffect(() => {
    buscar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Paper withBorder p="lg">
      <Title order={4} mb="md">
        Listado de accesos
      </Title>

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
