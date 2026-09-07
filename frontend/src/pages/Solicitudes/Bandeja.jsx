import { useEffect, useState } from 'react';
import { Alert, Paper, Title, Table, Button, Group, Textarea, Modal, Text, Code, TextInput, Badge, CopyButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { api } from '../../api/client';

export default function BandejaDBA() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [comentarios, setComentarios] = useState({});
  const [resultados, setResultados] = useState({}); // { [id]: { estado, log_ejecucion } }
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
      const data = await api.post(`/solicitudes/${id}/resolver`, { aprueba, comentario: comentarios[id] || '' });
      setResultados((r) => ({ ...r, [id]: data }));
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function verScript(id, estado = null) {
    setError('');
    try {
      const data = await api.get(`/solicitudes/${id}/script`);
      setScriptData({ ...data, estado });
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

  /* El script viene como una fila por base. Se junta todo para poder
     copiarlo de una sola vez a SSMS. */
  const scriptCompleto = (scriptData?.scripts ?? []).map((s) => s.script).join('\n\n');

  return (
    <Paper withBorder p="lg">
      <Title order={4} mb="md">
        Bandeja de aprobacion (DBA)
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        Aprobar habilita la solicitud, no ejecuta nada. Despues de aprobar, generá el script con
        "Ver script", revisalo y ejecutalo en SSMS. Cuando lo hayas aplicado, marcá la solicitud
        como aplicada.
      </Text>
      {error && (
        <Text c="red" size="sm" mb="sm">
          {error}
        </Text>
      )}

      <Table striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={70}>ID</Table.Th>
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
              <Table.Td colSpan={8}>
                <Text c="dimmed" ta="center" fs="italic" py="md">
                  No hay solicitudes pendientes.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
          {items.map((it) => {
            const resultado = resultados[it.id];
            return (
              <Table.Tr key={it.id}>
                <Table.Td>
                  <Text ff="monospace" fw={600}>
                    #{it.id}
                  </Text>
                </Table.Td>
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
                  <Group gap="xs" wrap="nowrap" mb={resultado ? 6 : 0}>
                    <Button size="xs" color="teal" onClick={() => resolver(it.id, true)}>
                      Aprobar
                    </Button>
                    <Button size="xs" color="red" variant="outline" onClick={() => resolver(it.id, false)}>
                      Rechazar
                    </Button>
                    {/* Se puede ver antes de aprobar: sirve para decidir. El SP
                        marca el texto como previsualizacion si no esta aprobada. */}
                    <Button size="xs" variant="light" onClick={() => verScript(it.id, it.estado)}>
                      {it.estado === 'APROBADA' ? 'Ver script' : 'Previsualizar'}
                    </Button>
                  </Group>
                  {resultado && (
                    <div>
                      <Badge size="xs" color={resultado.estado === 'APROBADA' ? 'teal' : 'gray'}>
                        {resultado.estado}
                      </Badge>
                      {resultado.log_ejecucion && (
                        <Text size="xs" c="dimmed" mt={2} style={{ whiteSpace: 'pre-line' }}>
                          {resultado.log_ejecucion}
                        </Text>
                      )}
                    </div>
                  )}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      <Title order={5} mt="xl" mb="xs">
        Por ID de solicitud
      </Title>
      <Text size="sm" c="dimmed" mb="sm">
        Para solicitudes que ya no estan en la bandeja: ver su script de nuevo, o marcarla como
        aplicada despues de ejecutarla en SSMS.
      </Text>
      <Group>
        <TextInput placeholder="ID de solicitud" value={idAccion} onChange={(e) => setIdAccion(e.currentTarget.value)} w={140} />
        <Button size="xs" variant="light" onClick={() => idAccion && verScript(idAccion)}>
          Ver script
        </Button>
        <Button size="xs" variant="light" color="teal" onClick={() => idAccion && marcarAplicada(idAccion)}>
          Marcar aplicada
        </Button>
      </Group>

      <Modal
        opened={scriptOpen}
        onClose={closeScript}
        title={`Script - Solicitud #${scriptData?.id_solicitud ?? ''}`}
        size="lg"
      >
        {scriptData?.estado && scriptData.estado !== 'APROBADA' && (
          <Alert color="orange" mb="sm" title="Previsualizacion">
            La solicitud esta en estado {scriptData.estado}. Este script es para revisar antes de
            decidir: no lo ejecutes hasta aprobarla.
          </Alert>
        )}
        <Group justify="space-between" mb="sm">
          <Text size="sm" c="dimmed">
            Revisalo antes de ejecutarlo. La aplicacion no corre DDL.
          </Text>
          <CopyButton value={scriptCompleto}>
            {({ copied, copy }) => (
              <Button size="xs" variant="default" onClick={copy}>
                {copied ? 'Copiado' : 'Copiar todo'}
              </Button>
            )}
          </CopyButton>
        </Group>
        {scriptData?.scripts.map((s, idx) => (
          <div key={idx} style={{ marginBottom: 16 }}>
            <Text fw={600} size="sm">
              {s.base}
            </Text>
            <Code block>{s.script}</Code>
          </div>
        ))}
      </Modal>
    </Paper>
  );
}
