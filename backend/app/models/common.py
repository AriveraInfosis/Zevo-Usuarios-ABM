"""app/models/common.py -- REEMPLAZA tu archivo actual.

Cambios:
  - AccionPermiso suma SOLO_ESCRITURA (queda con las 3 opciones acordadas).
  - ROLE_CATALOG pasa a mapear a LISTA de roles: db_datawriter no incluye
    SELECT en SQL Server, asi que "Lectura y escritura" son los dos roles.
    Se resuelve el TODO que estaba anotado, sin rol custom combinado.
"""

from enum import Enum


class TipoMovimiento(str, Enum):
    ALTA = "ALTA"
    BAJA = "BAJA"
    MODIFICACION = "MODIFICACION"
    CAMBIO_PASSWORD = "CAMBIO_PASSWORD"


class TipoUsuario(str, Enum):
    SQL = "SQL"
    API = "API"
    WINDOWS = "WINDOWS"


class EstadoSolicitud(str, Enum):
    PENDIENTE = "PENDIENTE"
    APROBADA = "APROBADA"
    RECHAZADA = "RECHAZADA"
    APLICADA = "APLICADA"


class AccionPermiso(str, Enum):
    """
    Desplegable del formulario: la persona elige la ACCION que necesita,
    no el nombre tecnico del rol de SQL Server. El mapeo a rol real vive
    en ROLE_CATALOG.
    """

    SOLO_LECTURA = "SOLO_LECTURA"
    SOLO_ESCRITURA = "SOLO_ESCRITURA"
    LECTURA_ESCRITURA = "LECTURA_ESCRITURA"


# db_datawriter da INSERT/UPDATE/DELETE pero NO SELECT, y entre roles fijos
# no hay herencia. Por eso "Lectura y escritura" son los dos roles, no uno
# combinado: no hace falta crear nada en cada base.
#
# El SP guarda esto en rol_permiso como CSV y lo splitea con STRING_SPLIT,
# generando un ALTER ROLE por rol. A nivel tabla, deriva los permisos:
#   db_datareader -> SELECT
#   db_datawriter -> INSERT, UPDATE, DELETE
ROLE_CATALOG: dict[AccionPermiso, list[str]] = {
    AccionPermiso.SOLO_LECTURA: ["db_datareader"],
    AccionPermiso.SOLO_ESCRITURA: ["db_datawriter"],
    AccionPermiso.LECTURA_ESCRITURA: ["db_datareader", "db_datawriter"],
}


def roles_csv(accion: AccionPermiso) -> str:
    """Formato que espera el parametro @rol_permiso del SP."""
    return ",".join(ROLE_CATALOG[accion])
