from contextlib import contextmanager

import pyodbc

from app.config import settings


def _build_connection_string() -> str:
    parts = [
        f"DRIVER={{{settings.db_driver}}}",
        f"SERVER={settings.db_server}",
        f"DATABASE={settings.db_database}",
    ]
    if settings.db_trusted_connection:
        parts.append("Trusted_Connection=yes")
    else:
        parts.append(f"UID={settings.db_user}")
        parts.append(f"PWD={settings.db_password}")
    return ";".join(parts)


CONNECTION_STRING = _build_connection_string()


@contextmanager
def get_connection():
    """
    Abre una conexion por request. pyodbc mantiene pooling a nivel de
    driver (pooling=True por defecto), asi que esto no abre una conexion
    TCP nueva en cada llamada.
    """
    conn = pyodbc.connect(CONNECTION_STRING, autocommit=True)
    try:
        yield conn
    finally:
        conn.close()


def get_db():
    """Dependency de FastAPI: entrega una conexion y la cierra al terminar el request."""
    with get_connection() as conn:
        yield conn


def rows_to_dicts(cursor) -> list[dict]:
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]
