from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends

from app.database import get_connection, get_db, rows_to_dicts
from app.dependencies import get_current_user, require_dba
from app.models.auth import UsuarioActual
from app.models.permisos import (
    EstadoCarga,
    PermisoItem,
    PermisosResponse,
    RefrescarRequest,
    RefrescarResponse,
    ResumenUsuario,
)

router = APIRouter()


@router.get("", response_model=PermisosResponse)
def listar_permisos(
    base: Optional[str] = None,
    usuario: Optional[str] = None,
    objeto: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    conn=Depends(get_db),
    _current_user: UsuarioActual = Depends(get_current_user),
):
    filtros: list[str] = []
    params: list[str] = []
    if base:
        filtros.append("base LIKE ?")
        params.append(f"%{base}%")
    if usuario:
        filtros.append("usuario LIKE ?")
        params.append(f"%{usuario}%")
    if objeto:
        filtros.append("objeto LIKE ?")
        params.append(f"%{objeto}%")
    where = f"WHERE {' AND '.join(filtros)}" if filtros else ""

    cursor = conn.cursor()
    cursor.execute(f"SELECT COUNT(*) FROM OBSERVABILIDAD.ZeusPermisos {where}", *params)
    total = cursor.fetchone()[0]

    offset = (page - 1) * page_size
    cursor.execute(
        f"""
        SELECT id, fecha_captura, base, usuario, tipo_usuario, rol, origen, esquema, objeto
        FROM   OBSERVABILIDAD.ZeusPermisos
        {where}
        ORDER BY base, usuario
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
        """,
        *params,
        offset,
        page_size,
    )
    items = [PermisoItem(**row) for row in rows_to_dicts(cursor)]
    return PermisosResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/usuario/{usuario}", response_model=list[PermisoItem])
def permisos_por_usuario(
    usuario: str,
    conn=Depends(get_db),
    _current_user: UsuarioActual = Depends(get_current_user),
):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, fecha_captura, base, usuario, tipo_usuario, rol, origen, esquema, objeto
        FROM   OBSERVABILIDAD.ZeusPermisos
        WHERE  usuario = ?
        ORDER BY base
        """,
        usuario,
    )
    return [PermisoItem(**row) for row in rows_to_dicts(cursor)]


@router.get("/tabla/{objeto}", response_model=list[PermisoItem])
def permisos_por_tabla(
    objeto: str,
    conn=Depends(get_db),
    _current_user: UsuarioActual = Depends(get_current_user),
):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, fecha_captura, base, usuario, tipo_usuario, rol, origen, esquema, objeto
        FROM   OBSERVABILIDAD.ZeusPermisos
        WHERE  objeto = ?
        ORDER BY base, usuario
        """,
        objeto,
    )
    return [PermisoItem(**row) for row in rows_to_dicts(cursor)]


@router.get("/resumen", response_model=list[ResumenUsuario])
def resumen_por_usuario(
    conn=Depends(get_db),
    _current_user: UsuarioActual = Depends(get_current_user),
):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT usuario, COUNT(DISTINCT base) AS cant_bases
        FROM   OBSERVABILIDAD.ZeusPermisos
        GROUP BY usuario
        ORDER BY cant_bases DESC
        """
    )
    return [ResumenUsuario(**row) for row in rows_to_dicts(cursor)]


@router.get("/estado-carga", response_model=EstadoCarga)
def estado_carga(
    conn=Depends(get_db),
    _current_user: UsuarioActual = Depends(get_current_user),
):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT COUNT(*) AS filas, COUNT(DISTINCT base) AS bases, MAX(fecha_captura) AS foto
        FROM   OBSERVABILIDAD.ZeusPermisos
        """
    )
    row = rows_to_dicts(cursor)[0]
    return EstadoCarga(filas=row["filas"], bases=row["bases"], fecha_ultima_carga=row["foto"])


def _ejecutar_carga(filtro: str) -> None:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("EXEC OBSERVABILIDAD.usp_ZeusPermisos_Cargar @Filtro = ?", filtro)


@router.post("/refrescar", response_model=RefrescarResponse, status_code=202)
def refrescar(
    body: RefrescarRequest,
    background_tasks: BackgroundTasks,
    _current_user: UsuarioActual = Depends(require_dba),
):
    # Se ejecuta en background porque recorre TODAS las bases del filtro
    # (con 200+ bases puede tardar); el frontend hace poll a /estado-carga.
    background_tasks.add_task(_ejecutar_carga, body.filtro)
    return RefrescarResponse()
