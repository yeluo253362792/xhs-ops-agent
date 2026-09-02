from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # 忽略未定义的环境变量
    )

    app_env: str = "development"
    debug: bool = True
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/xhs_ops_agent"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "dev-secret-key-change-in-production"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # LLM 配置
    llm_provider: str = "mock"
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = ""

    # 发布任务配置
    publish_task_ttl_seconds: int = 86400  # 24 小时
    publish_token_ttl_seconds: int = 600   # 10 分钟
    publish_token_refresh_window_seconds: int = 300
    temp_image_url_ttl_seconds: int = 900  # 15 分钟
    temp_image_max_size_mb: int = 10
    temp_image_max_count: int = 9
    temp_image_storage_path: str = "data/temp_images"

    # 限流
    publish_task_create_rate_limit: str = "10/hour"
    publish_poll_rate_limit: str = "60/minute"
    publish_upload_rate_limit: str = "20/hour"

    # 选择器配置
    extension_selector_cache_ttl_seconds: int = 3600

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        """
        调整配置来源优先级，让 .env 文件优先级高于系统环境变量。
        pydantic-settings 默认顺序中，后加载的来源会覆盖前面的来源。
        这里将 dotenv_settings 放在 env_settings 之后，使 .env 文件优先生效。
        """
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            file_secret_settings,
        )


settings = Settings()
