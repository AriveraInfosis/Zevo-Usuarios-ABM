from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.auth import (
    LoginRequest,
    LoginResponse,
    RegistroRequest,
    RegistroResponse,
    UsuarioActual,
)
from app.security import create_access_token, hash_password, verify_password

router = APIRouter()


@router.post("/registro", response_model=RegistroResponse, status_code=status.HTTP_201_CREATED)
def registro(body: RegistroRequest, conn=Depends(get_db)):
    if not body.email.lower().endswith(settings.allowed_email_domain):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Solo se permiten emails del dominio {settings.allowed_email_domain}",
        )

    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM OBSERVABILIDAD.Usuarios WHERE email = ?", body.email)
    if cursor.fetchone():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ese email ya esta registrado")

    password_hash = hash_password(body.password)
    cursor.execute(
        """
        INSERT INTO OBSERVABILIDAD.Usuarios (email, password_hash)
        OUTPUT INSERTED.id, INSERTED.es_dba
        VALUES (?, ?)
        """,
        body.email,
        password_hash,
    )
    row = cursor.fetchone()
    return RegistroResponse(id=row[0], email=body.email, es_dba=bool(row[1]))


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, conn=Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT password_hash, es_dba, activo FROM OBSERVABILIDAD.Usuarios WHERE email = ?",
        body.email,
    )
    row = cursor.fetchone()
    if not row or not verify_password(body.password, row[0]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

    password_hash, es_dba, activo = row
    if not activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo")

    cursor.execute(
        "UPDATE OBSERVABILIDAD.Usuarios SET ultimo_login = SYSDATETIME() WHERE email = ?",
        body.email,
    )

    token = create_access_token(email=body.email, es_dba=bool(es_dba))
    return LoginResponse(access_token=token, es_dba=bool(es_dba))


@router.get("/me", response_model=UsuarioActual)
def me(current_user: UsuarioActual = Depends(get_current_user)):
    return current_user
