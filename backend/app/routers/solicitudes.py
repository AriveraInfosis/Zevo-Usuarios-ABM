from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db, rows_to_dicts
from app.dependencies import get_current_user, require_dba
from app.models.auth import UsuarioActual
from app.models.common import TipoMovimiento, roles_csv
from app.models.solicitudes import (
    DetalleTabla,
    ScriptGeneradoResponse,
    ScriptPorBase,
    SolicitudAplicarResponse,
    SolicitudCreate,
    SolicitudCreateResponse,
    SolicitudItem,
    SolicitudResolverRequest,
    SolicitudResolverResponse,
    SolicitudesResponse,
)

router = APIRouter()


@router.post("", response_model=SolicitudCreateResponse, status_code=201)
def crear_solicitud(
    body: SolicitudCreate,
    conn=Depends(get_db),
    current_user: UsuarioActual = Depends(get_current_user),
):
    rol_permiso = None
    if body.tipo_movimiento in (TipoMovimiento.ALTA, TipoMovimiento.MODIFICACION):
        if body.accion is None:
            raise HTTPException(status_code=400, detail="Para ALTA o MODIFICACION hay que indicar la accion buscada")
        # CSV: "Lectura y escritura" son dos roles (db_datawriter no incluye
        # SELECT). El SP los splitea con STRING_SPLIT.
        rol_permiso = roles_csv(body.accion)

    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            EXEC OBSERVABILIDAD.usp_Solicitud_Registrar
                 @solicitante     = ?,
                 @tipo_movimiento = ?,
                 @usuario         = ?,
                 @alcance_bases   = ?,
                 @rol_permiso     = ?,
                 @tipo_usuario    = ?,
                 @justificacion   = ?,
                 @tablas          = ?
            """,
            current_user.email,
            body.tipo_movimiento.value,
            body.usuario,
            body.alcance_bases,
            rol_permiso,
            body.tipo_usuario.value,
            body.justificacion,
            # None = permiso a nivel base, comportamiento previo.
            ",".join(body.tablas) if body.tablas else None,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    row = cursor.fetchone()
    return SolicitudCreateResponse(id_solicitud=row[0])


@router.get("", response_model=SolicitudesResponse)
def listar_solicitudes(
    estado: Optional[str] = None,
    usuario: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    conn=Depends(get_db),
    current_user: UsuarioActual = Depends(get_current_user),
):
    filtros: list[str] = []
    params: list[str] = []
    if not current_user.es_dba:
        filtros.append("solicitante = ?")
        params.append(current_user.email)
    if estado:
        filtros.append("estado = ?")
        params.append(estado)
    if usuario:
        filtros.append("usuario LIKE ?")
        params.append(f"%{usuario}%")
    where = f"WHERE {' AND '.join(filtros)}" if filtros else ""

    cursor = conn.cursor()
    cursor.execute(f"SELECT COUNT(*) FROM OBSERVABILIDAD.ZeusSolicitudes {where}", *params)
    total = cursor.fetchone()[0]

    offset = (page - 1) * page_size
    cursor.execute(
        f"""
        SELECT id, fecha_solicitud, solicitante, tipo_movimiento, usuario, tipo_usuario,
               alcance_bases, rol_permiso, justificacion, estado, aprobador,
               fecha_resolucion, comentario, fecha_aplicacion, log_ejecucion
        FROM   OBSERVABILIDAD.ZeusSolicitudes
        {where}
        ORDER BY fecha_solicitud DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
        """,
        *params,
        offset,
        page_size,
    )
    items = [SolicitudItem(**row) for row in rows_to_dicts(cursor)]
    return SolicitudesResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/pendientes", response_model=list[SolicitudItem])
def solicitudes_pendientes(
    conn=Depends(get_db),
    _current_user: UsuarioActual = Depends(require_dba),
):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM OBSERVABILIDAD.vw_SolicitudesPendientes ORDER BY fecha_solicitud")
    items = []
    for row in rows_to_dicts(cursor):
        # la vista no trae aprobador/fecha_resolucion/etc.
        row.setdefault("aprobador", None)
        row.setdefault("fecha_resolucion", None)
        row.setdefault("comentario", None)
        row.setdefault("fecha_aplicacion", None)
        row.setdefault("estado", "PENDIENTE")
        items.append(SolicitudItem(**row))
    return items


# Va ANTES de /{id_solicitud}: si quedara despues, esa ruta generica se
# come /{id}/tablas y nunca llega aca.
@router.get("/{id_solicitud}/tablas", response_model=list[DetalleTabla])
def validar_tablas(
    id_solicitud: int,
    conn=Depends(get_db),
    _current_user: UsuarioActual = Depends(require_dba),
):
    """
    Marca que tablas del pedido existen en la base de la solicitud.
    Lista vacia = la solicitud es a nivel base, no hay detalle que validar.
    """
    cursor = conn.cursor()
    try:
        cursor.execute("EXEC OBSERVABILIDAD.usp_Solicitud_ValidarTablas @id = ?", id_solicitud)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return [DetalleTabla(**row) for row in rows_to_dicts(cursor)]


@router.get("/{id_solicitud}", response_model=SolicitudItem)
def obtener_solicitud(
    id_solicitud: int,
    conn=Depends(get_db),
    current_user: UsuarioActual = Depends(get_current_user),
):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM OBSERVABILIDAD.ZeusSolicitudes WHERE id = ?", id_solicitud)
    rows = rows_to_dicts(cursor)
    if not rows:
        raise HTTPException(status_code=404, detail="La solicitud no existe")

    item = SolicitudItem(**rows[0])
    if not current_user.es_dba and item.solicitante != current_user.email:
        raise HTTPException(status_code=404, detail="La solicitud no existe")
    return item


@router.post("/{id_solicitud}/resolver", response_model=SolicitudResolverResponse)
def resolver_solicitud(
    id_solicitud: int,
    body: SolicitudResolverRequest,
    conn=Depends(get_db),
    current_user: UsuarioActual = Depends(require_dba),
):
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            EXEC OBSERVABILIDAD.usp_Solicitud_Resolver
                 @id         = ?,
                 @aprobador  = ?,
                 @aprueba    = ?,
                 @comentario = ?
            """,
            id_solicitud,
            current_user.email,
            int(body.aprueba),
            body.comentario,
        )
    except Exception as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    # El SP ahora decide el estado final internamente (RECHAZADA, o APLICADA
    # si la ejecucion salio bien, o se queda en APROBADA con el error logueado
    # si algo fallo) -- lo leemos de vuelta en lugar de asumirlo del booleano.
    cursor.execute(
        "SELECT estado, log_ejecucion FROM OBSERVABILIDAD.ZeusSolicitudes WHERE id = ?",
        id_solicitud,
    )
    row = cursor.fetchone()
    return SolicitudResolverResponse(id=id_solicitud, estado=row[0], log_ejecucion=row[1])


@router.get("/{id_solicitud}/script", response_model=ScriptGeneradoResponse)
def generar_script(
    id_solicitud: int,
    conn=Depends(get_db),
    _current_user: UsuarioActual = Depends(require_dba),
):
    cursor = conn.cursor()

    # El SP de generacion se planta si el detalle de tablas no esta validado.
    # Se valida aca para que el DBA no tenga que hacer dos llamadas.
    # Es barato e idempotente: si la solicitud es a nivel base, no hace nada.
    try:
        cursor.execute("EXEC OBSERVABILIDAD.usp_Solicitud_ValidarTablas @id = ?", id_solicitud)
        while cursor.nextset():
            pass
    except Exception:
        # Una falla aca no debe tapar el error real del SP de generacion,
        # que es mas descriptivo. Se deja seguir.
        cursor = conn.cursor()

    try:
        cursor.execute("EXEC OBSERVABILIDAD.usp_Solicitud_GenerarScript @id = ?", id_solicitud)
    except Exception as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    scripts = [ScriptPorBase(base=row.base, script=row.script) for row in cursor.fetchall()]
    return ScriptGeneradoResponse(id_solicitud=id_solicitud, scripts=scripts)


@router.post("/{id_solicitud}/aplicar", response_model=SolicitudAplicarResponse)
def marcar_aplicada(
    id_solicitud: int,
    conn=Depends(get_db),
    _current_user: UsuarioActual = Depends(require_dba),
):
    cursor = conn.cursor()
    try:
        cursor.execute("EXEC OBSERVABILIDAD.usp_Solicitud_MarcarAplicada @id = ?", id_solicitud)
    except Exception as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    cursor.execute("SELECT fecha_aplicacion FROM OBSERVABILIDAD.ZeusSolicitudes WHERE id = ?", id_solicitud)
    fecha_aplicacion = cursor.fetchone()[0]
    return SolicitudAplicarResponse(id=id_solicitud, estado="APLICADA", fecha_aplicacion=fecha_aplicacion)
