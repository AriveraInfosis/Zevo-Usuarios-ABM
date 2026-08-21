from enum import Enum


class TipoMovimiento(str, Enum):
    ALTA = "ALTA"
    BAJA = "BAJA"
    MODIFICACION = "MODIFICACION"


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
    LECTURA_ESCRITURA = "LECTURA_ESCRITURA"


# TODO (a confirmar con DBA): db_datawriter por si solo NO incluye SELECT
# en SQL Server (solo INSERT/UPDATE/DELETE). Si "Lectura y escritura" debe
# incluir lectura real, aca hay que apuntar a un rol propio ya combinado
# (creado en cada base) en lugar de db_datawriter puro, o extender el SP
# para aceptar mas de un rol por solicitud.
ROLE_CATALOG: dict[AccionPermiso, str] = {
    AccionPermiso.SOLO_LECTURA: "db_datareader",
    AccionPermiso.LECTURA_ESCRITURA: "db_datawriter",
}
