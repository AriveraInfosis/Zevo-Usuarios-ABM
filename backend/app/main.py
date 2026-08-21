from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auditoria, auth, bases, permisos, solicitudes

app = FastAPI(title="Zeus Permisos & Solicitudes API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(permisos.router, prefix="/api/v1/permisos", tags=["permisos"])
app.include_router(bases.router, prefix="/api/v1/bases", tags=["bases"])
app.include_router(solicitudes.router, prefix="/api/v1/solicitudes", tags=["solicitudes"])
app.include_router(auditoria.router, prefix="/api/v1/auditoria", tags=["auditoria"])


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
