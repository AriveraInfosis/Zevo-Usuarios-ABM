# Backend - Zeus Permisos & Solicitudes

## Requisitos
- Python 3.11+
- Driver ODBC de SQL Server instalado (ODBC Driver 17 o 18 for SQL Server)
- La cuenta de servicio que use esta API necesita:
  - EXEC sobre los SPs de `ToolsDB.OBSERVABILIDAD`
  - SELECT sobre `ZeusPermisos`, `ZeusSolicitudes`, `Usuarios` y las vistas de `OBSERVABILIDAD`
  - SELECT sobre `ZeusManager.dbo.conexiones` (lo usa el preview de alcance)

## Instalacion

    python -m venv venv
    venv\Scripts\activate        # Windows
    source venv/bin/activate     # Linux/Mac
    pip install -r requirements.txt

Copiar `.env.example` a `.env` y completar los datos de conexion.

## Correr en local

    uvicorn app.main:app --reload --port 8000

Swagger interactivo: http://localhost:8000/docs

## Pendiente de tu lado en SQL

1. Crear la tabla `OBSERVABILIDAD.Usuarios` (definicion en el contrato de API).
2. Confirmar los permisos de la cuenta de servicio detallados arriba.
3. Definir si "Lectura y escritura" necesita un rol propio combinado
   (ver TODO en `app/models/common.py`).

## Estructura

    app/
    |-- main.py            # arranque de FastAPI, routers, CORS
    |-- config.py          # settings desde .env
    |-- database.py        # conexion pyodbc + helper de resultados
    |-- security.py        # hashing + JWT
    |-- dependencies.py    # get_current_user / require_dba
    |-- models/            # schemas Pydantic (contrato de la API)
    `-- routers/            # un archivo por grupo de endpoints
