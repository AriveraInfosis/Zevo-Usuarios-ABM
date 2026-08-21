import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, Title, TextInput, PasswordInput, Button, Text, Stack, Tabs, Alert } from '@mantine/core';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, registro } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setOkMsg('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/');
      } else {
        await registro(email, password);
        setOkMsg('Cuenta creada. Ya podes iniciar sesion.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Paper withBorder shadow="sm" p="xl" style={{ maxWidth: 380, margin: '60px auto' }}>
      <Title order={3} mb="md">
        {mode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
      </Title>

      <Tabs value={mode} onChange={setMode} mb="md">
        <Tabs.List grow>
          <Tabs.Tab value="login">Ingresar</Tabs.Tab>
          <Tabs.Tab value="registro">Registrarme</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {error && (
        <Alert color="red" mb="sm">
          {error}
        </Alert>
      )}
      {okMsg && (
        <Alert color="green" mb="sm">
          {okMsg}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          <TextInput
            label="Email"
            placeholder="usuario@infosis.tech"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />
          <PasswordInput
            label="Contrasena"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
          />
          <Button type="submit" fullWidth loading={loading}>
            {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </Button>
        </Stack>
      </form>

      <Text size="xs" c="dimmed" mt="sm">
        Solo se permiten cuentas con email @infosis.tech.
      </Text>
    </Paper>
  );
}
