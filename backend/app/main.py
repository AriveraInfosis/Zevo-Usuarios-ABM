from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import auditoria, auth, bases, permisos, solicitudes, router_password

app = FastAPI(title="Zeus Permisos & Solicitudes API", version="0.1.0")


@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    # IMPORTANTE: este middleware se registra ANTES que CORSMiddleware a proposito.
    # Starlette arma capas concentricas y un error no controlado que escapa hasta
    # afuera de TODO (incluido CORSMiddleware) llega al navegador sin headers de
    # CORS -> Chrome lo reporta como "bloqueado por CORS" y tapa el error real.
    # Atajando la excepcion ACA (por dentro de CORS) garantiza que la respuesta
    # de error sí pase por el middleware de CORS y lleve el header correcto.
    try:
        return await call_next(request)
    except Exception as exc:
        return JSONResponse(status_code=500, content={"detail": f"Error interno: {exc}"})


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
app.include_router(router_password.router, prefix="/api/v1/solicitudes", tags=["password"])


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
