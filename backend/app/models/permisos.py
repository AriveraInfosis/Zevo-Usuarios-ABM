"""app/models/permisos.py

Unico cambio respecto del original: RefrescarRequest.filtro pasa de
'ZEUS%' a None. El resto de los modelos queda igual.
"""

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
    # Antes el default era 'ZEUS%', y eso dejaba fuera del inventario a
    # cualquier usuario que no arrancara con ZEUS: los permisos otorgados
    # por el circuito ABM no aparecian en la pantalla de permisos.
    #
    # Ahora el alcance lo define el SP por tipo de principal
    # (type IN ('S','U','G','E','X') AND principal_id > 4), que ya incluye
    # las cuentas ZEUS. Este filtro queda opcional, para acotar la carga
    # a mano cuando haga falta.
    filtro: Optional[str] = None


class RefrescarResponse(BaseModel):
    mensaje: str = "Recarga iniciada"
