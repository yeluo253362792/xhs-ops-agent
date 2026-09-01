import json
import logging
import re
from typing import Optional

from app.schemas.generation import GenerateRequest, GenerateResponse, GeneratedContent, ComplianceResult
from app.services.llm_client import LLMClient
from app.services.prompt_templates import SYSTEM_PROMPT, build_prompt
from app.services.compliance_service import check_content_compliance

logger = logging.getLogger(__name__)


class GenerationService:
    def __init__(self):
        self.llm_client = LLMClient()

    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        try:
            user_prompt = build_prompt(request)
            raw_output = await self.llm_client.generate(SYSTEM_PROMPT, user_prompt)
            content_dict = self._parse_llm_output(raw_output)

            # 补充 topic 字段
            content_dict["topic"] = request.topic

            # 合规检测
            compliance = check_content_compliance(content_dict)
            if compliance.level == "high":
                return GenerateResponse(
                    success=False,
                    compliance=compliance,
                    error="生成内容存在高风险合规问题，请调整输入后重试",
                )

            generated_content = GeneratedContent(**content_dict)
            return GenerateResponse(
                success=True,
                data=generated_content,
                compliance=compliance,
                remaining_quota=None,  # 由上层根据用户配额填充
            )
        except Exception as e:
            logger.exception("Generation failed")
            return GenerateResponse(
                success=False,
                error=f"生成失败：{str(e)}",
            )

    def _parse_llm_output(self, raw_output: str) -> dict:
        """解析 LLM 输出，支持 JSON 代码块或直接 JSON。"""
        # 尝试提取 ```json ... ``` 代码块
        code_block_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw_output)
        if code_block_match:
            json_str = code_block_match.group(1).strip()
        else:
            json_str = raw_output.strip()

        # 如果 JSON 前面有说明文字，尝试找第一个 `{`
        start_idx = json_str.find("{")
        if start_idx > 0:
            json_str = json_str[start_idx:]

        # 如果 JSON 后面还有内容，尝试找最后一个 `}`
        end_idx = json_str.rfind("}")
        if end_idx > 0:
            json_str = json_str[: end_idx + 1]

        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM output as JSON: {raw_output[:500]}")
            raise RuntimeError(f"LLM 输出无法解析为 JSON: {str(e)}")
