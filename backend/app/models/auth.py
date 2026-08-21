from pydantic import BaseModel, EmailStr


class RegistroRequest(BaseModel):
    email: EmailStr
    password: str


class RegistroResponse(BaseModel):
    id: int
    email: str
    es_dba: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    es_dba: bool


class UsuarioActual(BaseModel):
    email: str
    es_dba: bool
