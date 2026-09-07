import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Button,
  Group,
  Loader,
  MultiSelect,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";

import { api } from "../../api/client";

/* Valores del enum AccionPermiso del backend. El usuario elige la accion,
   no el nombre tecnico del rol: el mapeo vive en ROLE_CATALOG (common.py).
   "Lectura y escritura" resuelve a db_datareader + db_datawriter, porque
   db_datawriter por si solo no incluye SELECT. */
const ACCIONES = [
  { value: "SOLO_LECTURA", label: "Solo lectura" },
  { value: "SOLO_ESCRITURA", label: "Solo escritura" },
  { value: "LECTURA_ESCRITURA", label: "Lectura y escritura" },
];

const PERMISOS_INICIAL = {
  tipo_movimiento: "ALTA",
  usuario: "",
  bases: [],
  tablas: [],
  accion: "SOLO_LECTURA",
  justificacion: "",
};

const PASSWORD_INICIAL = {
  usuario: "",
  justificacion: "",
};

function validarPermisos(v) {
  const err = {};
  if (!v.usuario.trim()) err.usuario = "Indicá el usuario.";
  if (v.bases.length === 0) err.bases = "Elegí al menos una base.";
  if (v.tipo_movimiento !== "BAJA" && !v.accion)
    err.accion = "Elegí el permiso a otorgar.";
  if (v.justificacion.trim().length < 10)
    err.justificacion = "Contá para qué se necesita (mínimo 10 caracteres).";
  return err;
}

function validarPassword(v) {
  const err = {};
  if (!v.usuario.trim()) {
    err.usuario = "Indicá el login.";
  } else if (v.usuario.trim().toUpperCase().startsWith("ZEUS")) {
    err.usuario =
      "Las cuentas de servicio ZEUS no se rotan por acá. Coordiná con el equipo de aplicación.";
  }
  if (v.justificacion.trim().length < 10)
    err.justificacion = "Contá el motivo del cambio (mínimo 10 caracteres).";
  return err;
}

export default function NuevaSolicitud() {
  const navigate = useNavigate();

  const [modo, setModo] = useState("permisos");
  const [permisos, setPermisos] = useState(PERMISOS_INICIAL);
  const [password, setPassword] = useState(PASSWORD_INICIAL);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  /* Catalogo de bases: sale de ZeusBasesCatalogo via /bases/preview. */
  const [bases, setBases] = useState([]);
  const [cargandoBases, setCargandoBases] = useState(true);
  const [errorBases, setErrorBases] = useState(null);

  /* Catalogo de tablas: se lee en vivo de la PRIMERA base elegida.
     Las mismas tablas se piden para todas las bases seleccionadas. */
  const [tablas, setTablas] = useState([]);
  const [cargandoTablas, setCargandoTablas] = useState(false);
  const [errorTablas, setErrorTablas] = useState(null);

  /* Logins de la instancia. Es Autocomplete y no Select porque en BAJA puede
     hacer falta escribir un usuario huerfano que ya no tiene login. */
  const [logins, setLogins] = useState([]);
  const [loginsSql, setLoginsSql] = useState([]);

  const esPassword = modo === "password";
  const baseReferencia = permisos.bases[0] ?? null;

  useEffect(() => {
    let cancelado = false;

    async function cargarLogins() {
      try {
        const data = await api.get("/bases/logins");
        if (cancelado) return;
        // Las deshabilitadas se muestran igual: darles permiso es valido.
        setLogins(data.map((l) => l.usuario));
        // Password solo aplica a logins SQL que no sean cuentas de servicio.
        setLoginsSql(data.filter((l) => l.es_sql && !l.es_servicio).map((l) => l.usuario));
      } catch {
        // Si falla, los campos siguen aceptando texto libre.
        if (!cancelado) {
          setLogins([]);
          setLoginsSql([]);
        }
      }
    }

    cargarLogins();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function cargarBases() {
      try {
        const data = await api.get("/bases/preview");
        if (!cancelado) setBases(data.bases_afectadas ?? []);
      } catch (e) {
        if (!cancelado) setErrorBases(e?.message ?? "No se pudo cargar el listado de bases.");
      } finally {
        if (!cancelado) setCargandoBases(false);
      }
    }

    cargarBases();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    if (!baseReferencia) {
      setTablas([]);
      setErrorTablas(null);
      setPermisos((prev) => (prev.tablas.length ? { ...prev, tablas: [] } : prev));
      return;
    }

    async function cargarTablas() {
      setCargandoTablas(true);
      setErrorTablas(null);
      try {
        const data = await api.get(`/bases/${encodeURIComponent(baseReferencia)}/tablas`);
        if (cancelado) return;
        const objetos = data.map((t) => t.objeto);
        setTablas(objetos);
        /* Si cambio la base de referencia, se descarta lo elegido que ya no exista. */
        setPermisos((prev) => ({
          ...prev,
          tablas: prev.tablas.filter((t) => objetos.includes(t)),
        }));
      } catch (e) {
        if (!cancelado) {
          setErrorTablas(e?.message ?? "No se pudieron leer las tablas de esta base.");
          setTablas([]);
        }
      } finally {
        if (!cancelado) setCargandoTablas(false);
      }
    }

    cargarTablas();
    return () => {
      cancelado = true;
    };
  }, [baseReferencia]);

  function cambiarPermisos(campo, valor) {
    setPermisos((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  function cambiarPassword(campo, valor) {
    setPassword((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  }

  function cambiarModo(nuevo) {
    setModo(nuevo);
    setErrores({});
    setError(null);
  }

  async function enviarPassword() {
    const data = await api.post("/solicitudes/password", password);
    navigate(`/solicitudes/mias?nueva=${data.id_solicitud}`);
  }

  async function enviarPermisos() {
    /* Una solicitud por base: cada una se aprueba y audita por separado,
       y el alcance queda como nombre exacto en lugar de patron LIKE.
       Las tablas elegidas van iguales en todas: el DBA ve marcadas las que
       no existan en cada base al revisar. */
    const base = {
      tipo_movimiento: permisos.tipo_movimiento,
      usuario: permisos.usuario.trim(),
      justificacion: permisos.justificacion.trim(),
      // tipo_usuario no se manda: el backend lo default'ea a SQL.
      accion: permisos.tipo_movimiento === "BAJA" ? null : permisos.accion,
      tablas: permisos.tablas,
    };

    const creadas = [];
    const fallidas = [];

    for (const nombreBase of permisos.bases) {
      try {
        const data = await api.post("/solicitudes", { ...base, alcance_bases: nombreBase });
        creadas.push(data.id_solicitud);
      } catch (e) {
        fallidas.push(`${nombreBase}: ${e?.message ?? "error desconocido"}`);
      }
    }

    /* Parcial: no se navega, para que el usuario vea que fallo y con cuales
       bases reintentar. Las que salieron bien ya quedaron registradas. */
    if (fallidas.length > 0) {
      setError(
        `Se registraron ${creadas.length} de ${permisos.bases.length} solicitudes. ` +
          `Fallaron: ${fallidas.join(" | ")}`
      );
      setPermisos((prev) => ({
        ...prev,
        bases: prev.bases.filter((b) => fallidas.some((f) => f.startsWith(`${b}:`))),
      }));
      return;
    }

    navigate(`/solicitudes/mias?nuevas=${creadas.length}`);
  }

  async function enviar() {
    const fallos = esPassword ? validarPassword(password) : validarPermisos(permisos);

    if (Object.keys(fallos).length > 0) {
      setErrores(fallos);
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      if (esPassword) {
        await enviarPassword();
      } else {
        await enviarPermisos();
      }
    } catch (e) {
      setError(e?.message ?? "No se pudo registrar la solicitud.");
    } finally {
      setEnviando(false);
    }
  }

  const cantidadBases = permisos.bases.length;
  const cantidadTablas = permisos.tablas.length;

  const descripcionTablas = () => {
    if (!baseReferencia) return "Elegí una base primero.";
    if (errorTablas) return undefined;
    if (cantidadTablas === 0)
      return "Vacío = acceso a toda la base. Elegí tablas para acotar el permiso.";
    if (cantidadBases > 1)
      return `${cantidadTablas} tabla(s) del catálogo de ${baseReferencia}. Se piden iguales en las ${cantidadBases} bases; las que no existan quedan fuera del script.`;
    return `${cantidadTablas} tabla(s) elegidas en ${baseReferencia}.`;
  };

  return (
    <Stack gap="lg" maw={640}>
      <div>
        <Title order={2}>Nueva solicitud</Title>
        <Text c="dimmed" size="sm">
          El equipo de DBA revisa y aprueba antes de aplicar cualquier cambio.
        </Text>
      </div>

      <SegmentedControl
        value={modo}
        onChange={cambiarModo}
        fullWidth
        data={[
          { value: "permisos", label: "Permisos de acceso" },
          { value: "password", label: "Cambio de contraseña" },
        ]}
      />

      <Paper withBorder p="lg" radius="md">
        <Stack gap="md">
          {error && (
            <Alert color="red" title="Revisá esto">
              {error}
            </Alert>
          )}

          {!esPassword ? (
            <>
              <Select
                label="Movimiento"
                value={permisos.tipo_movimiento}
                onChange={(v) => cambiarPermisos("tipo_movimiento", v)}
                allowDeselect={false}
                data={[
                  { value: "ALTA", label: "Alta de acceso" },
                  { value: "MODIFICACION", label: "Modificación de permisos" },
                  { value: "BAJA", label: "Baja de acceso" },
                ]}
              />

              <Autocomplete
                label="Usuario"
                placeholder="Zeus.PICKING"
                description={
                  logins.length
                    ? `${logins.length} logins en la instancia. Escribí para buscar.`
                    : undefined
                }
                data={logins}
                value={permisos.usuario}
                onChange={(v) => cambiarPermisos("usuario", v)}
                error={errores.usuario}
                limit={20}
              />

              <MultiSelect
                label="Bases de datos"
                placeholder={
                  cargandoBases
                    ? "Cargando…"
                    : cantidadBases === 0
                    ? "Escribí para buscar y elegí una o varias"
                    : ""
                }
                description={
                  errorBases
                    ? undefined
                    : cantidadBases > 1
                    ? `${cantidadBases} bases elegidas → se van a registrar ${cantidadBases} solicitudes, una por base.`
                    : `${bases.length} bases disponibles. Podés elegir más de una.`
                }
                data={bases}
                value={permisos.bases}
                onChange={(v) => cambiarPermisos("bases", v)}
                error={errores.bases ?? errorBases}
                disabled={cargandoBases || Boolean(errorBases)}
                searchable
                clearable
                hidePickedOptions
                nothingFoundMessage="Ninguna base coincide"
                maxDropdownHeight={280}
              />

              <MultiSelect
                label="Tablas (opcional)"
                placeholder={
                  !baseReferencia
                    ? ""
                    : cargandoTablas
                    ? "Cargando…"
                    : cantidadTablas === 0
                    ? "Dejalo vacío para toda la base"
                    : ""
                }
                description={descripcionTablas()}
                data={tablas}
                value={permisos.tablas}
                onChange={(v) => cambiarPermisos("tablas", v)}
                error={errorTablas}
                disabled={!baseReferencia || cargandoTablas || Boolean(errorTablas)}
                rightSection={cargandoTablas ? <Loader size="xs" /> : undefined}
                searchable
                clearable
                hidePickedOptions
                nothingFoundMessage="Ninguna tabla coincide"
                maxDropdownHeight={280}
              />

              {permisos.tipo_movimiento !== "BAJA" && (
                <Select
                  label="Permiso"
                  value={permisos.accion}
                  onChange={(v) => cambiarPermisos("accion", v)}
                  allowDeselect={false}
                  data={ACCIONES}
                  error={errores.accion}
                />
              )}

              {permisos.tipo_movimiento === "BAJA" && cantidadTablas > 0 && (
                <Alert color="blue" title="Baja por tabla">
                  Se quitan los permisos solo sobre esas tablas. El usuario
                  conserva el acceso al resto de la base.
                </Alert>
              )}

              <Textarea
                label="Justificación"
                placeholder="Para qué se necesita el acceso."
                minRows={3}
                autosize
                value={permisos.justificacion}
                onChange={(e) => cambiarPermisos("justificacion", e.currentTarget.value)}
                error={errores.justificacion}
              />
            </>
          ) : (
            <>
              <Alert color="blue" title="La contraseña no se escribe acá">
                El DBA la genera al aprobar el pedido y te la entrega por canal
                seguro. Vas a tener que cambiarla en tu primer inicio de sesión.
              </Alert>

              <Autocomplete
                label="Login"
                placeholder="jperez"
                description="Login SQL de la instancia. Los usuarios de dominio se gestionan desde IT."
                data={loginsSql}
                value={password.usuario}
                onChange={(v) => cambiarPassword("usuario", v)}
                error={errores.usuario}
                limit={20}
              />

              <Textarea
                label="Motivo"
                placeholder="Rotación trimestral, contraseña olvidada, cuenta bloqueada…"
                minRows={3}
                autosize
                value={password.justificacion}
                onChange={(e) => cambiarPassword("justificacion", e.currentTarget.value)}
                error={errores.justificacion}
              />
            </>
          )}

          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button onClick={enviar} loading={enviando}>
              {esPassword
                ? "Pedir cambio de contraseña"
                : cantidadBases > 1
                ? `Enviar ${cantidadBases} solicitudes`
                : "Enviar solicitud"}
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
