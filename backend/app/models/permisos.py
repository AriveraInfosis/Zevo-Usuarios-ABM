from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PermisoItem(BaseModel):
    id: int
    fecha_captura: datetime
    base: str
    usuario: str
    tipo_usuario: Optional[str] = None
    rol: Optional[str] = None
    origen: str
    esquema: Optional[str] = None
    objeto: Optional[str] = None


class PermisosResponse(BaseModel):
    items: list[PermisoItem]
    total: int
    page: int
    page_size: int


class ResumenUsuario(BaseModel):
    usuario: str
    cant_bases: int


class EstadoCarga(BaseModel):
    filas: int
    bases: int
    fecha_ultima_carga: Optional[datetime] = None


class RefrescarRequest(BaseModel):
    filtro: str = "ZEUS%"


class RefrescarResponse(BaseModel):
    mensaje: str = "Recarga iniciada"
