from datetime import datetime

from app.config import settings


DEFAULT_SELECTORS = {
    "version": "2026-09-02-01",
    "updated_at": datetime.utcnow().isoformat(),
    "selectors": {
        "titleInput": [
            'input[placeholder*="标题"]',
            'textarea[placeholder*="标题"]',
            '[class*="title"] input',
            '[data-testid="note-title-input"]'
        ],
        "bodyTextarea": [
            'textarea[placeholder*="正文"]',
            'div[contenteditable="true"][placeholder*="正文"]',
            '[class*="content"] textarea',
            '[data-testid="note-content-input"]'
        ],
        "tagInput": [
            'input[placeholder*="标签"]',
            'input[placeholder*="话题"]',
            '[data-testid="note-tag-input"]'
        ],
        "imageUpload": [
            'input[type="file"][accept*="image"]',
            '[data-testid="image-upload"] input[type="file"]',
            '[class*="upload"] input[type="file"]'
        ],
        "publishButton": [
            'button:contains("发布")',
            '[data-testid="publish-button"]',
            '[class*="publish"] button'
        ],
        "loginIndicator": [
            '.creator-home',
            '.publish-entry',
            '[data-testid="user-avatar"]'
        ],
        "loginQrCode": [
            '.login-qrcode',
            '.login-form'
        ]
    }
}


class ExtensionSelectorService:
    @staticmethod
    def get_selectors() -> dict:
        return DEFAULT_SELECTORS.copy()

    @staticmethod
    def get_cache_ttl() -> int:
        return settings.extension_selector_cache_ttl_seconds
