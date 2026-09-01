"""
测试 LLM API 连通性。

用法：
    cd apps/api
    source venv/bin/activate
    python scripts/test_qwen.py

需要在 .env 中配置，例如：
    LLM_PROVIDER=qwen
    LLM_API_KEY=your-dashscope-api-key
    LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
    LLM_MODEL=qwen-plus
"""
import asyncio
import os
import sys

# 将项目根目录加入路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.services.llm_client import LLMClient
from app.services.prompt_templates import SYSTEM_PROMPT, build_prompt
from app.schemas.generation import GenerateRequest


async def main():
    print(f"读取来源：{ '系统环境变量' if not settings.model_config.get('env_file') else '.env 文件 / 环境变量（.env 优先）'}")
    print(f"LLM_PROVIDER: {settings.llm_provider}")
    print(f"LLM_MODEL: {settings.llm_model}")
    print(f"LLM_BASE_URL: {settings.llm_base_url}")
    print(f"LLM_API_KEY: {'已设置' if settings.llm_api_key else '未设置'}")
    print("-" * 50)

    client = LLMClient()
    request = GenerateRequest(
        topic="油皮夏季护肤",
        audience="20-30岁油皮女生",
        content_type="干货收藏型",
        tone="亲切自然",
    )
    prompt = build_prompt(request)

    try:
        output = await client.generate(SYSTEM_PROMPT, prompt)
        print("✅ API 调用成功")
        print("=" * 50)
        print(output[:1000])
        print("=" * 50)
    except Exception as e:
        print(f"❌ API 调用失败: {str(e)}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
