import { useEffect, useState } from 'react';
import { Paper, Title, Table, Button, Group, Textarea, Modal, Text, Code, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { api } from '../../api/client';

export default function BandejaDBA() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [comentarios, setComentarios] = useState({});
  const [scriptOpen, { open: openScript, close: closeScript }] = useDisclosure(false);
  const [scriptData, setScriptData] = useState(null);
  const [idAccion, setIdAccion] = useState('');

  async function cargar() {
    try {
      const data = await api.get('/solicitudes/pendientes');
      setItems(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function resolver(id, aprueba) {
    setError('');
    try {
      await api.post(`/solicitudes/${id}/resolver`, { aprueba, comentario: comentarios[id] || '' });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function verScript(id) {
    setError('');
    try {
      const data = await api.get(`/solicitudes/${id}/script`);
      setScriptData(data);
      openScript();
    } catch (err) {
      setError(err.message);
    }
  }

  async function marcarAplicada(id) {
    setError('');
    try {
      await api.post(`/solicitudes/${id}/aplicar`);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Paper withBorder p="lg">
      <Title order={4} mb="md">
        Bandeja de aprobacion (DBA)
      </Title>
      {error && (
        <Text c="red" size="sm" mb="sm">
          {error}
        </Text>
      )}

      <Table striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Fecha</Table.Th>
            <Table.Th>Solicitante</Table.Th>
            <Table.Th>Tipo</Table.Th>
            <Table.Th>Usuario</Table.Th>
            <Table.Th>Alcance</Table.Th>
            <Table.Th>Comentario</Table.Th>
            <Table.Th>Acciones</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={7}>
                <Text c="dimmed" ta="center" fs="italic" py="md">
                  No hay solicitudes pendientes.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {items.map((it) => (
            <Table.Tr key={it.id}>
              <Table.Td>{new Date(it.fecha_solicitud).toLocaleString()}</Table.Td>
              <Table.Td>{it.solicitante}</Table.Td>
              <Table.Td>{it.tipo_movimiento}</Table.Td>
              <Table.Td>{it.usuario}</Table.Td>
              <Table.Td>{it.alcance_bases}</Table.Td>
              <Table.Td>
                <Textarea
                  size="xs"
                  placeholder="Comentario (opcional)"
                  autosize
                  minRows={1}
                  onChange={(e) => setComentarios({ ...comentarios, [it.id]: e.currentTarget.value })}
                />
              </Table.Td>
              <Table.Td>
                <Group gap="xs" wrap="nowrap">
                  <Button size="xs" color="teal" onClick={() => resolver(it.id, true)}>
                    Aprobar
                  </Button>
                  <Button size="xs" color="red" variant="outline" onClick={() => resolver(it.id, false)}>
                    Rechazar
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Title order={5} mt="xl" mb="xs">
        Solicitudes aprobadas — generar script / marcar aplicada
      </Title>
      <Text size="sm" c="dimmed" mb="sm">
        Ingresa el ID de una solicitud ya aprobada (lo ves en "Mis solicitudes" del solicitante, o en el listado general).
      </Text>
      <Group>
        <TextInput placeholder="ID de solicitud" value={idAccion} onChange={(e) => setIdAccion(e.currentTarget.value)} w={140} />
        <Button size="xs" variant="light" onClick={() => idAccion && verScript(idAccion)}>
          Ver script generado
        </Button>
        <Button size="xs" variant="light" color="teal" onClick={() => idAccion && marcarAplicada(idAccion)}>
          Marcar aplicada
        </Button>
      </Group>

      <Modal opened={scriptOpen} onClose={closeScript} title={`Script generado - Solicitud #${scriptData?.id_solicitud ?? ''}`} size="lg">
        {scriptData?.scripts.map((s, idx) => (
          <div key={idx} style={{ marginBottom: 16 }}>
            <Text fw={600} size="sm">
              {s.base}
            </Text>
            <Code block>{s.script}</Code>
          </div>
        ))}
        <Text size="xs" c="dimmed" mt="sm">
          Copia y ejecuta este script manualmente en SSMS. La aplicacion no lo ejecuta por vos.
        </Text>
      </Modal>
    </Paper>
  );
}
