import { useState } from 'react';
import { Paper, Title, Select, TextInput, Textarea, Button, Group, Text, Alert } from '@mantine/core';
import { api } from '../../api/client';

const ACCIONES = [
  { value: 'SOLO_LECTURA', label: 'Solo lectura' },
  { value: 'LECTURA_ESCRITURA', label: 'Lectura y escritura' },
];

const ESTADO_INICIAL = {
  tipo_movimiento: 'ALTA',
  usuario: '',
  alcance_bases: '',
  accion: 'SOLO_LECTURA',
  tipo_usuario: 'SQL',
  justificacion: '',
};

export default function NuevaSolicitud() {
  const [form, setForm] = useState(ESTADO_INICIAL);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [enviado, setEnviado] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function verBasesAfectadas() {
    if (!form.alcance_bases) return;
    setLoadingPreview(true);
    setError('');
    try {
      const data = await api.get('/bases/preview', { patron: form.alcance_bases });
      setPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setEnviado(null);
    setLoading(true);
    try {
      const body = { ...form };
      if (form.tipo_movimiento === 'BAJA') delete body.accion;
      const data = await api.post('/solicitudes', body);
      setEnviado(data.id_solicitud);
      setForm(ESTADO_INICIAL);
      setPreview(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Paper withBorder p="lg" style={{ maxWidth: 520 }}>
      <Title order={4} mb="md">
        Nueva solicitud
      </Title>

      {enviado && (
        <Alert color="green" mb="md">
          Solicitud #{enviado} enviada correctamente. El equipo de Base de Datos la revisara.
        </Alert>
      )}
      {error && (
        <Alert color="red" mb="md">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Select
          label="Tipo de movimiento"
          data={[
            { value: 'ALTA', label: 'Alta' },
            { value: 'MODIFICACION', label: 'Modificacion' },
            { value: 'BAJA', label: 'Baja' },
          ]}
          value={form.tipo_movimiento}
          onChange={(v) => update('tipo_movimiento', v)}
          mb="sm"
        />

        <TextInput
          label="Usuario"
          placeholder="ej: jperez"
          value={form.usuario}
          onChange={(e) => update('usuario', e.currentTarget.value)}
          mb="sm"
          required
        />

        <TextInput
          label="Alcance (patron de bases)"
          description="Usa % como comodin, ej: Desarrollo% para todas las que empiecen asi"
          placeholder="ej: Desarrollo% o KROMACOLOR"
          value={form.alcance_bases}
          onChange={(e) => {
            update('alcance_bases', e.currentTarget.value);
            setPreview(null);
          }}
          mb="xs"
          required
        />
        <Group mb="sm">
          <Button variant="light" size="xs" onClick={verBasesAfectadas} loading={loadingPreview}>
            Ver bases afectadas
          </Button>
          {preview && (
            <Text size="xs" c={preview.cantidad === 0 ? 'red' : 'dimmed'}>
              {preview.cantidad === 0
                ? 'Ninguna base coincide con ese patron.'
                : `${preview.cantidad} base(s): ${preview.bases_afectadas.join(', ')}`}
            </Text>
          )}
        </Group>

        {form.tipo_movimiento !== 'BAJA' && (
          <Select label="Accion" data={ACCIONES} value={form.accion} onChange={(v) => update('accion', v)} mb="sm" required />
        )}

        <Select
          label="Tipo de usuario"
          data={['SQL', 'API', 'WINDOWS']}
          value={form.tipo_usuario}
          onChange={(v) => update('tipo_usuario', v)}
          mb="sm"
        />

        <Textarea
          label="Justificacion"
          placeholder="Motivo de la solicitud"
          value={form.justificacion}
          onChange={(e) => update('justificacion', e.currentTarget.value)}
          minRows={3}
          mb="md"
        />

        <Button type="submit" fullWidth loading={loading}>
          Enviar solicitud
        </Button>
      </form>
    </Paper>
  );
}
