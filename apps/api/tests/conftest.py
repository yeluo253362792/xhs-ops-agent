import os

# 强制测试环境使用 mock LLM，避免调用真实 API
os.environ["LLM_PROVIDER"] = "mock"
os.environ["LLM_API_KEY"] = ""
os.environ["LLM_BASE_URL"] = ""
os.environ["LLM_MODEL"] = ""

# 导入并覆盖 settings，确保 .env 文件不会覆盖测试用的 mock 配置
import app.config  # noqa: E402

app.config.settings.llm_provider = "mock"
app.config.settings.llm_api_key = ""
app.config.settings.llm_base_url = ""
app.config.settings.llm_model = ""
