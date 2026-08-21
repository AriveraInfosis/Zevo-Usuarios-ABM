# Frontend - Zeus Permisos & Solicitudes

## Requisitos
- Node.js 18+ (LTS recomendado)
- El backend corriendo en http://localhost:8000 (ver backend_zeus.zip)

## Instalacion

    npm install
    copy .env.example .env

`.env` ya apunta por defecto a `http://localhost:8000/api/v1` - solo cambialo si tu backend corre en otro puerto.

## Correr en desarrollo

    npm run dev

Abre en: http://localhost:5173

## Estructura

    src/
    |-- api/client.js          # fetch wrapper: base URL, token, manejo de errores 401
    |-- context/AuthContext.jsx # login/logout/registro, guarda el token en localStorage
    |-- components/
    |   |-- Layout.jsx          # topbar (sesion, rol, salir) + tabs de navegacion
    |   `-- ProtectedRoute.jsx  # RequireAuth / RequireDba
    |-- pages/
    |   |-- Login.jsx
    |   |-- ListadoAccesos.jsx        # dashboard de permisos (GET /permisos)
    |   |-- Solicitudes/
    |   |   |-- Nueva.jsx              # formulario + preview de alcance en vivo
    |   |   |-- Mias.jsx                # historial propio
    |   |   `-- Bandeja.jsx             # aprobar/rechazar/script/aplicar (solo DBA)
    |   `-- Auditoria.jsx        # permisos sin solicitud (solo DBA)
    `-- App.jsx                  # rutas

## Diferencias respecto al mockup2_accesos_bd.html que compartiste

- No incluye la card de "Cambio de contrasena" - no hay ningun SP en el backend
  que soporte esa operacion todavia. Es un track aparte a definir si lo necesitas.
- El alcance de bases no es un desplegable fijo (3 bases) sino un patron LIKE con
  boton de "Ver bases afectadas" que consulta ZeusManager.dbo.conexiones en vivo -
  necesario porque el proyecto real apunta a 200+ bases, no a 3.
- El rol (DBA o Solicitante) no se elige en el login (ahi era solo demo) - lo
  determina el backend segun `OBSERVABILIDAD.Usuarios.es_dba` despues de autenticar.
- El listado de accesos queda visible con filtros completos para cualquier usuario
  autenticado (no solo DBA) - se mantiene el espiritu original del proyecto como
  herramienta de visibilidad general. Si preferis restringirlo, se ajusta rapido.
