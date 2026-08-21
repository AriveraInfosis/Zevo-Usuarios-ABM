from fastapi import APIRouter, Depends

from app.database import get_db
from app.dependencies import get_current_user
from app.models.auth import UsuarioActual
from app.models.bases import BasePreviewResponse

router = APIRouter()


@router.get("/preview", response_model=BasePreviewResponse)
def preview_alcance(
    patron: str,
    conn=Depends(get_db),
    _current_user: UsuarioActual = Depends(get_current_user),
):
    """
    Muestra que bases matchean un patron LIKE antes de enviar la solicitud.
    Se resuelve directo contra ZeusManager.dbo.conexiones (el catalogo real
    de bases del cliente) -- sin SP nuevo.
    """
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT database_name AS base
        FROM   ZeusManager.dbo.conexiones
        WHERE  database_name LIKE ?
        ORDER BY database_name
        """,
        patron,
    )
    bases = [row.base for row in cursor.fetchall()]
    return BasePreviewResponse(patron=patron, bases_afectadas=bases, cantidad=len(bases))
