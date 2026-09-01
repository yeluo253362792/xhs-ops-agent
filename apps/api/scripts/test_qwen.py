"""
测试通义千问 API 连通性。

用法：
    cd apps/api
    source venv/bin/activate
    python scripts/test_qwen.py

需要在 .env 中配置：
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

from app.services.llm_client import LLMClient
from app.services.prompt_templates import SYSTEM_PROMPT, build_prompt
from app.schemas.generation import GenerateRequest


async def main():
    print(f"LLM_PROVIDER: {os.getenv('LLM_PROVIDER', 'not set')}")
    print(f"LLM_MODEL: {os.getenv('LLM_MODEL', 'not set')}")
    print(f"LLM_BASE_URL: {os.getenv('LLM_BASE_URL', 'not set')}")
    print(f"LLM_API_KEY: {'已设置' if os.getenv('LLM_API_KEY') else '未设置'}")
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
