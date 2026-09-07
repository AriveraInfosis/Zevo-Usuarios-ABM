"""
Zeus Permisos & Solicitudes - Circuito de cambio de contrasena.

Se monta en main.py con:
    app.include_router(router_password.router, prefix="/api/v1/solicitudes", tags=["password"])

Rutas resultantes:
    POST /api/v1/solicitudes/password              -> TESTING registra el pedido
    GET  /api/v1/solicitudes/password/pendientes   -> bandeja DBA
    GET  /api/v1/solicitudes/{id}/script           -> script T-SQL (DBA)

Nota: en ningun endpoint viaja una contrasena. El script se genera con el
placeholder <<NUEVA_PASSWORD>> y lo reemplaza el DBA en SSMS.
"""

from datetime import datetime
from typing import List, Optional

import pyodbc
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.database import get_db, rows_to_dicts
from app.dependencies import get_current_user, require_dba

# Sin prefix: lo pone main.py. Si lo dejaramos aca, se concatenaria y
# las rutas quedarian /api/v1/solicitudes/solicitudes/password.
router = APIRouter()


# =============================================================================
# Modelos
# =============================================================================

class SolicitudPasswordIn(BaseModel):
    """Lo unico que manda el frontend: a quien y por que. Nunca la password."""
    usuario: str = Field(..., min_length=1, max_length=128)
    justificacion: str = Field(..., min_length=10, max_length=500)

    @field_validator("usuario")
    @classmethod
    def sin_corchetes(cls, v: str) -> str:
        # QUOTENAME lo agrega el SP; si vienen del front se duplican.
        return v.strip().strip("[]")


class SolicitudPasswordOut(BaseModel):
    id: int
    fecha_solicitud: datetime
    solicitante: str
    usuario: str
    justificacion: Optional[str] = None
    estado: str
    is_disabled: Optional[bool] = None
    is_policy_checked: Optional[bool] = None
    ultima_password: Optional[datetime] = None
    dias_desde_ultimo_cambio: Optional[int] = None


class LineaScript(BaseModel):
    base: str
    script: str


# =============================================================================
# Helper: traducir RAISERROR del SP a HTTP 400
# =============================================================================

def _error_sql(exc: pyodbc.Error) -> HTTPException:
    """
    Los SP validan con RAISERROR(..., 16, 1). pyodbc los levanta como
    ProgrammingError / DatabaseError con el mensaje del server adentro.
    Son errores de negocio, no fallas de infraestructura -> 400, no 500.
    """
    mensaje = str(exc)
    if "[SQL Server]" in mensaje:
        mensaje = mensaje.split("[SQL Server]")[-1].split("(")[0].strip()
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=mensaje)


# =============================================================================
# 1. Registrar solicitud de cambio de password
# =============================================================================

@router.post("/password", status_code=status.HTTP_201_CREATED)
def registrar_cambio_password(
    body: SolicitudPasswordIn,
    user=Depends(get_current_user),
    cn=Depends(get_db),
):
    """
    El solicitante sale del JWT, no del body: si viniera del front,
    cualquiera podria registrar pedidos a nombre de otro.
    """
    try:
        cur = cn.cursor()
        cur.execute(
            """
            EXEC OBSERVABILIDAD.usp_Solicitud_Registrar
                  @solicitante     = ?
                , @tipo_movimiento = 'CAMBIO_PASSWORD'
                , @usuario         = ?
                , @justificacion   = ?;
            """,
            user.email,
            body.usuario,
            body.justificacion,
        )
        fila = cur.fetchone()
        # Sin commit(): get_connection() abre con autocommit=True.
        # Llamarlo aca puede tirar error de estado de transaccion invalido.
    except pyodbc.Error as exc:
        raise _error_sql(exc)

    if fila is None:
        raise HTTPException(status_code=500, detail="El SP no devolvio id_solicitud.")

    return {"id_solicitud": int(fila[0]), "estado": "PENDIENTE"}


# =============================================================================
# 2. Bandeja DBA de cambios de password
# =============================================================================

@router.get(
    "/password/pendientes",
    response_model=List[SolicitudPasswordOut],
    dependencies=[Depends(require_dba)],
)
def bandeja_password(cn=Depends(get_db)):
    cur = cn.cursor()
    cur.execute(
        """
        SELECT id, fecha_solicitud, solicitante, usuario, justificacion,
               estado, is_disabled, is_policy_checked,
               ultima_password, dias_desde_ultimo_cambio
        FROM   OBSERVABILIDAD.vw_SolicitudesPasswordPendientes
        ORDER BY fecha_solicitud DESC;
        """
    )
    return rows_to_dicts(cur)


# =============================================================================
# 3. Generar script
# =============================================================================

@router.get(
    "/{id_solicitud}/script",
    response_model=List[LineaScript],
    dependencies=[Depends(require_dba)],
)
def generar_script(id_solicitud: int, cn=Depends(get_db)):
    """
    Sirve para los 4 tipos de movimiento. Para CAMBIO_PASSWORD el SP
    devuelve una sola fila (base = 'master'); para el resto, una por base.
    """
    try:
        cur = cn.cursor()
        cur.execute(
            "EXEC OBSERVABILIDAD.usp_Solicitud_GenerarScript @id = ?;",
            id_solicitud,
        )
        filas = cur.fetchall()
    except pyodbc.Error as exc:
        raise _error_sql(exc)

    if not filas:
        raise HTTPException(
            status_code=404,
            detail="Sin resultados: revisar que la solicitud este APROBADA "
                   "y que el alcance matchee alguna base.",
        )

    return [{"base": f[0], "script": f[1]} for f in filas]
