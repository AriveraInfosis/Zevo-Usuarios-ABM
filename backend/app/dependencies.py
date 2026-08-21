from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.auth import UsuarioActual
from app.security import decode_access_token

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> UsuarioActual:
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
        ) from exc

    return UsuarioActual(email=payload["sub"], es_dba=payload.get("es_dba", False))


def require_dba(current_user: UsuarioActual = Depends(get_current_user)) -> UsuarioActual:
    if not current_user.es_dba:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accion reservada al equipo DBA",
        )
    return current_user
