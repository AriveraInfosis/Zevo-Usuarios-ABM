from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db, rows_to_dicts
from app.dependencies import get_current_user
from app.models.auth import UsuarioActual
from app.models.bases import BasePreviewResponse
from app.models.solicitudes import TablaCatalogo

router = APIRouter()


@router.get("/preview", response_model=BasePreviewResponse)
def preview_alcance(
    patron: Optional[str] = None,
    conn=Depends(get_db),
    _current_user: UsuarioActual = Depends(get_current_user),
):
    """
    Devuelve las bases conocidas desde el snapshot local
    OBSERVABILIDAD.ZeusBasesCatalogo (refrescado por un SQL Agent Job) --
    ya NO consulta ZeusManager en vivo en cada request.

    Sin `patron`: devuelve el catalogo completo (para poblar el desplegable).
    Con `patron`: filtra por LIKE (para un futuro modo de alcance por patron).
    """
    cursor = conn.cursor()
    if patron:
        cursor.execute(
            "SELECT base FROM OBSERVABILIDAD.ZeusBasesCatalogo WHERE base LIKE ? ORDER BY base",
            patron,
        )
    else:
        cursor.execute("SELECT base FROM OBSERVABILIDAD.ZeusBasesCatalogo ORDER BY base")
    bases = [row.base for row in cursor.fetchall()]
    return BasePreviewResponse(patron=patron or "*", bases_afectadas=bases, cantidad=len(bases))


@router.get("/{base}/tablas", response_model=list[TablaCatalogo])
def listar_tablas(
    base: str,
    conn=Depends(get_db),
    _current_user: UsuarioActual = Depends(get_current_user),
):
    """
    Tablas de una base, para el selector del formulario de solicitud.

    A diferencia de /preview, esto SI lee el catalogo en vivo: la lista de
    tablas cambia con cada deploy y no tiene snapshot local. El SP valida
    contra ZeusBasesCatalogo antes de consultar, asi que no se puede pedir
    el catalogo de una base fuera del alcance de la herramienta.
    """
    cursor = conn.cursor()
    try:
        cursor.execute("EXEC OBSERVABILIDAD.usp_Bases_ListarTablas @base = ?", base)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo leer el catalogo de {base}: {exc}",
        ) from exc

    return [TablaCatalogo(**row) for row in rows_to_dicts(cursor)]
