from fastapi import APIRouter, Depends

from app.database import get_db, rows_to_dicts
from app.dependencies import require_dba
from app.models.auth import UsuarioActual

router = APIRouter()


@router.get("/permisos-sin-solicitud")
def permisos_sin_solicitud(
    conn=Depends(get_db),
    _current_user: UsuarioActual = Depends(require_dba),
):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM OBSERVABILIDAD.vw_PermisosSinSolicitud ORDER BY base, usuario")
    items = rows_to_dicts(cursor)
    return {"items": items, "total": len(items)}
