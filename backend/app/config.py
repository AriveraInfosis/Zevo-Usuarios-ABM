from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Conexion SQL Server
    db_server: str = "localhost"
    db_database: str = "ToolsDB"
    db_driver: str = "ODBC Driver 17 for SQL Server"
    db_trusted_connection: bool = True  # True = Windows Auth (uso local); False = usa db_user/db_password
    db_user: str | None = None
    db_password: str | None = None
    db_trust_server_certificate: bool = True  # necesario con ODBC Driver 18 contra SQL Server local (cert autofirmado)

    # JWT
    jwt_secret_key: str = "cambiar-esto-en-produccion"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480  # 8 horas

    # Reglas de negocio
    allowed_email_domain: str = "@infosis.tech"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
