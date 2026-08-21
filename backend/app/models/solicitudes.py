from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.common import AccionPermiso, EstadoSolicitud, TipoMovimiento, TipoUsuario


class SolicitudCreate(BaseModel):
    tipo_movimiento: TipoMovimiento
    usuario: str
    alcance_bases: str
    accion: Optional[AccionPermiso] = None  # requerido si ALTA/MODIFICACION, se valida en el endpoint
    tipo_usuario: TipoUsuario = TipoUsuario.SQL
    justificacion: Optional[str] = None


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
