import { useEffect, useState } from 'react';
import { Paper, Title, Table, Text } from '@mantine/core';
import { api } from '../api/client';

export default function Auditoria() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/auditoria/permisos-sin-solicitud')
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Paper withBorder p="lg">
      <Title order={4} mb="md">
        Permisos sin solicitud respaldando
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Accesos detectados en el ultimo relevamiento que no tienen una solicitud aplicada que los justifique.
      </Text>
      {error && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Base</Table.Th>
            <Table.Th>Usuario</Table.Th>
            <Table.Th>Rol</Table.Th>
            <Table.Th>Origen</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={4}>
                <Text c="dimmed" ta="center" fs="italic" py="md">
                  Sin alertas.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {items.map((it, idx) => (
            <Table.Tr key={idx}>
              <Table.Td>{it.base}</Table.Td>
              <Table.Td>{it.usuario}</Table.Td>
              <Table.Td>{it.rol}</Table.Td>
              <Table.Td>{it.origen}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}
