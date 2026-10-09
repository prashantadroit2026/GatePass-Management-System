from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Cloudflare D1 (production database). When all three are unset the app
    # runs against a local SQLite file (development mode).
    d1_account_id: str = ""
    d1_database_id: str = ""
    d1_api_token: str = ""

    # Local SQLite database used in development mode.
    local_db_path: str = "gatepass_dev.db"

    # JWT auth (issued by this backend's /auth/login endpoint).
    jwt_secret: str
    jwt_expire_minutes: int = 720  # 12 hours

    cors_origins: str = "*"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
