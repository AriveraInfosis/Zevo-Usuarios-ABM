"""app/models/solicitudes.py -- REEMPLAZA tu archivo actual.

Cambios: SolicitudCreate acepta `tablas`, y se agregan los modelos de
validacion del detalle. El resto queda igual.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from app.models.common import AccionPermiso, EstadoSolicitud, TipoMovimiento, TipoUsuario


class SolicitudCreate(BaseModel):
    tipo_movimiento: TipoMovimiento
    usuario: str
    alcance_bases: str
    accion: Optional[AccionPermiso] = None  # requerido si ALTA/MODIFICACION, se valida en el endpoint
    tipo_usuario: TipoUsuario = TipoUsuario.SQL
    justificacion: Optional[str] = None
    # Vacio = permiso a nivel base. Con contenido = permiso solo sobre esos objetos.
    tablas: list[str] = []

    @field_validator("tablas")
    @classmethod
    def calificadas(cls, v: list[str]) -> list[str]:
        limpias = []
        for t in v:
            t = (t or "").strip()
            if not t:
                continue
            if t.count(".") != 1 or t.startswith(".") or t.endswith("."):
                raise ValueError(f"'{t}' no tiene formato esquema.tabla. Ejemplo: dbo.Clientes")
            limpias.append(t)
        return sorted(set(limpias))


class SolicitudCreateResponse(BaseModel):
    id_solicitud: int


class SolicitudItem(BaseModel):
    id: int
    fecha_solicitud: datetime
    solicitante: str
    tipo_movimiento: TipoMovimiento
    usuario: str
    tipo_usuario: Optional[str] = None
    alcance_bases: str
    rol_permiso: Optional[str] = None
    justificacion: Optional[str] = None
    estado: EstadoSolicitud
    aprobador: Optional[str] = None
    fecha_resolucion: Optional[datetime] = None
    comentario: Optional[str] = None
    fecha_aplicacion: Optional[datetime] = None
    log_ejecucion: Optional[str] = None


class SolicitudesResponse(BaseModel):
    items: list[SolicitudItem]
    total: int
    page: int
    page_size: int


class SolicitudResolverRequest(BaseModel):
    aprueba: bool
    comentario: Optional[str] = None


class SolicitudResolverResponse(BaseModel):
    id: int
    estado: EstadoSolicitud
    log_ejecucion: Optional[str] = None


class ScriptPorBase(BaseModel):
    base: str
    script: str


class ScriptGeneradoResponse(BaseModel):
    id_solicitud: int
    scripts: list[ScriptPorBase]


class SolicitudAplicarResponse(BaseModel):
    id: int
    estado: EstadoSolicitud
    fecha_aplicacion: datetime


# --- Detalle de tablas -------------------------------------------------------

class DetalleTabla(BaseModel):
    id_detalle: int
    esquema: str
    tabla: str
    existe: Optional[bool] = None
    mensaje: Optional[str] = None


class TablaCatalogo(BaseModel):
    esquema: str
    tabla: str
    objeto: str


class LoginCatalogo(BaseModel):
    usuario: str
    tipo: str
    deshabilitado: bool
    es_sql: bool
    es_servicio: bool
