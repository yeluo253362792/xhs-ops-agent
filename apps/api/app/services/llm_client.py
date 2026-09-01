import json
from app.config import settings
from typing import Optional

import httpx


class LLMClient:
    """统一的 LLM 调用客户端，支持多 provider 和 fallback。"""

    # 各 provider 默认 base_url
    DEFAULT_BASE_URLS = {
        "qwen": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "openai": "https://api.openai.com/v1",
        "deepseek": "https://api.deepseek.com/v1",
        # 豆包也使用 OpenAI 兼容接口，具体地址需用户在环境变量中配置
        "doubao": "",
    }

    def __init__(self):
        self.provider = settings.llm_provider.lower()
        self.api_key = settings.llm_api_key
        self.base_url = settings.llm_base_url
        self.model = settings.llm_model

        # 为通义千问设置默认 base_url
        if self.provider == "qwen" and not self.base_url:
            self.base_url = self.DEFAULT_BASE_URLS["qwen"]

        # 如果 provider 支持 OpenAI 兼容接口但没有设置 base_url，使用默认地址
        if self.provider in ("openai", "deepseek") and not self.base_url:
            self.base_url = self.DEFAULT_BASE_URLS.get(self.provider, "")

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        """根据 provider 调用对应 LLM API。"""
        if self.provider == "mock" or not self.api_key:
            return self._mock_generate(user_prompt)

        # qwen / openai / deepseek / doubao 均使用 OpenAI 兼容接口
        if self.provider in ("qwen", "openai", "deepseek", "doubao"):
            return await self._call_openai_compatible(system_prompt, user_prompt)

        return self._mock_generate(user_prompt)

    async def _call_openai_compatible(self, system_prompt: str, user_prompt: str) -> str:
        """调用 OpenAI 兼容接口（通义千问、DeepSeek、豆包等均支持）。"""
        if not self.base_url:
            raise ValueError(f"请配置 {self.provider} 的 LLM_BASE_URL")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.7,
            "max_tokens": 2000,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    def _mock_generate(self, user_prompt: str) -> str:
        """本地 mock 生成，用于无 API key 时开发和测试。"""
        topic = self._extract_topic(user_prompt)
        return json.dumps(
            {
                "titles": [
                    f"{topic}｜这篇攻略我整理了一周，建议收藏",
                    f"拯救{topic}困难户！3步搞定",
                    f"关于{topic}，我必须说的大实话",
                ],
                "body": f"姐妹们！今天来聊聊{topic}。\n\n作为目标受众，我真的踩过太多坑了。\n\n✨ 第一步：认清问题\n很多人一开始就做错了。\n\n✨ 第二步：建立正确流程\n1. 做好基础准备\n2. 选择合适的方法\n3. 坚持 2-4 周看效果\n\n✨ 第三步：避开常见误区\n• 不要盲目跟风\n• 不要急于求成\n\n💡 如果觉得有用，记得点赞收藏！",
                "tags": [f"#{topic}", "#干货分享", "#收藏夹吃灰系列", "#变美日记", "#生活小技巧"],
                "cover_text": f"{topic}\n3步搞定",
                "cover_design": [
                    "尺寸：3:4 竖图",
                    "构图：主体清晰，文字占比约 1/5",
                    "配色：清爽明亮",
                    "字体：粗体无衬线，白字深色描边",
                    "元素：可加入数字标签增强点击欲",
                ],
                "image_script": [
                    {"content": "痛点场景图", "desc": "自然光拍摄，表现困扰场景", "text": "你是不是也有这个烦恼？"},
                    {"content": "步骤一说明", "desc": "方法/产品特写，背景干净", "text": "第一步：找准问题"},
                    {"content": "步骤二说明", "desc": "动作/使用过程展示", "text": "第二步：正确流程"},
                    {"content": "避坑清单", "desc": "文字卡片，红叉标注误区", "text": "这些坑千万别踩"},
                    {"content": "总结图", "desc": "要点回顾，适合收藏", "text": "一图看懂全流程"},
                ],
                "publish_suggestions": [
                    "最佳发布时间：工作日 20:00-22:00",
                    "发布后 30 分钟内积极回复评论",
                ],
            },
            ensure_ascii=False,
        )

    def _extract_topic(self, prompt: str) -> str:
        """从 prompt 中提取主题，用于 mock 输出。"""
        if "主题：" in prompt:
            line = prompt.split("主题：")[1].split("\n")[0]
            return line.strip()
        return "这个话题"
