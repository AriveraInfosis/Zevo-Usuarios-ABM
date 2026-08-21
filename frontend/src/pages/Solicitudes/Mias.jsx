import { useEffect, useState } from 'react';
import { Paper, Title, Table, Badge, Text } from '@mantine/core';
import { api } from '../../api/client';

const ESTADO_COLOR = { PENDIENTE: 'yellow', APROBADA: 'blue', RECHAZADA: 'red', APLICADA: 'green' };

export default function MisSolicitudes() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/solicitudes', { page_size: 100 })
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Paper withBorder p="lg">
      <Title order={4} mb="md">
        Mis solicitudes
      </Title>
      {error && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Fecha</Table.Th>
            <Table.Th>Tipo</Table.Th>
            <Table.Th>Usuario</Table.Th>
            <Table.Th>Alcance</Table.Th>
            <Table.Th>Estado</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed" ta="center" fs="italic" py="md">
                  Todavia no enviaste ninguna solicitud.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {items.map((it) => (
            <Table.Tr key={it.id}>
              <Table.Td>{new Date(it.fecha_solicitud).toLocaleString()}</Table.Td>
              <Table.Td>{it.tipo_movimiento}</Table.Td>
              <Table.Td>{it.usuario}</Table.Td>
              <Table.Td>{it.alcance_bases}</Table.Td>
              <Table.Td>
                <Badge color={ESTADO_COLOR[it.estado]}>{it.estado}</Badge>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
