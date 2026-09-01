SYSTEM_PROMPT = """你是一位资深的小红书运营专家，擅长帮素人博主写出有爆款潜质的图文笔记。

你的输出必须严格符合以下要求：
1. 语言风格真实、自然、有生活感，避免过度营销和"AI味"。
2. 标题要吸引人，但不要使用夸大、虚假或违反平台规则的表述。
3. 正文结构清晰，适合小红书阅读：短段落、emoji、分点说明。
4. 标签要精准，5-10个，包含核心词、场景词和长尾词。
5. 封面文案控制在12字以内，突出核心卖点。
6. 图片脚本要具体，说明每张图拍什么、怎么拍、配什么文字。
7. 必须遵守合规要求：不使用极限词（第一、最好、根治等），不做医疗/金融功效承诺，不诱导外部导流。

输出必须是 JSON 格式，字段如下：
{
  "titles": ["标题1", "标题2", "标题3"],
  "body": "正文内容",
  "tags": ["#标签1", "#标签2", "#标签3", "#标签4", "#标签5"],
  "cover_text": "封面大字",
  "cover_design": ["设计建议1", "设计建议2", "设计建议3", "设计建议4", "设计建议5"],
  "image_script": [
    {"content": "图1内容", "desc": "拍摄建议", "text": "配图文字"},
    ...
  ],
  "publish_suggestions": ["发布时间建议", "互动引导建议"]
}
"""

CONTENT_TYPE_TEMPLATES = {
    "干货收藏型": """请写一篇"干货收藏型"小红书笔记。

主题：{topic}
目标受众：{audience}
语气：{tone}
补充信息：{extra_info}

内容要求：
- 痛点 + 方法 + 步骤 + 总结
- 多用清单、数字、分点
- 结尾引导收藏和评论
""",
    "种草带货型": """请写一篇"种草带货型"小红书笔记。

主题：{topic}
目标受众：{audience}
语气：{tone}
补充信息：{extra_info}

内容要求：
- 真实体验感，像朋友推荐
- 说明适合人群和使用场景
- 客观提及优缺点
- 如果是商业内容，在正文末尾提示"#自费购买"或"#合作"
""",
    "情绪共鸣型": """请写一篇"情绪共鸣型"小红书笔记。

主题：{topic}
目标受众：{audience}
语气：{tone}
补充信息：{extra_info}

内容要求：
- 用故事或感悟切入
- 引发目标受众的情感共鸣
- 结尾用提问引导评论区互动
""",
    "争议讨论型": """请写一篇"争议讨论型"小红书笔记。

主题：{topic}
目标受众：{audience}
语气：{tone}
补充信息：{extra_info}

内容要求：
- 提出鲜明观点或常见误区
- 有理有据地表达立场
- 结尾抛出争议性问题，引导评论
""",
    "涨粉型": """请写一篇"涨粉型"小红书笔记。

主题：{topic}
目标受众：{audience}
语气：{tone}
补充信息：{extra_info}

内容要求：
- 建立人设，展示账号价值
- 说明关注后能获得什么
- 结尾明确引导关注
""",
}


def build_prompt(request: "GenerateRequest") -> str:
    template = CONTENT_TYPE_TEMPLATES.get(request.content_type, CONTENT_TYPE_TEMPLATES["干货收藏型"])
    extra = request.extra_info or "无"
    return template.format(
        topic=request.topic,
        audience=request.audience,
        tone=request.tone or "亲切自然",
        extra_info=extra,
    )
