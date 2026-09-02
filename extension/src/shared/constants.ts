import type { SelectorConfig } from './types'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
export const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL || 'http://localhost:3000'

export const POLL_INTERVALS = {
  HAS_TASKS: 3000,
  NO_TASKS: 30000,
  ERROR: 60000,
  MIN: 1000
}

export const TASK_TTL_SECONDS = 86400
export const PUBLISH_TOKEN_TTL_SECONDS = 600
export const IMAGE_URL_TTL_SECONDS = 900

export const STORAGE_KEYS = {
  PUBLISH_TOKEN: 'xhs_publish_token',
  TOKEN_EXPIRES_AT: 'xhs_token_expires_at',
  ACTIVE_TASK_ID: 'xhs_active_task_id',
  PENDING_TASKS: 'xhs_pending_tasks',
  SELECTOR_VERSION: 'xhs_selector_version',
  SELECTORS: 'xhs_selectors',
  SETTINGS: 'xhs_settings',
  USER_INFO: 'xhs_user_info'
} as const

export const DEFAULT_SETTINGS = {
  notifyNewTask: true,
  notifyFillComplete: true,
  notifyLoginRequired: false,
  pollInterval: 'auto'
}

export const PLATFORM_SELECTORS: SelectorConfig = {
  version: 'default',
  updated_at: new Date().toISOString(),
  selectors: {
    titleInput: [
      'input[placeholder*="标题"]',
      'textarea[placeholder*="标题"]',
      '[class*="title"] input',
      '[data-testid="note-title-input"]'
    ],
    bodyTextarea: [
      'textarea[placeholder*="正文"]',
      'div[contenteditable="true"][placeholder*="正文"]',
      '[class*="content"] textarea',
      '[data-testid="note-content-input"]'
    ],
    tagInput: [
      'input[placeholder*="标签"]',
      'input[placeholder*="话题"]',
      '[data-testid="note-tag-input"]'
    ],
    imageUpload: [
      'input[type="file"][accept*="image"]',
      '[data-testid="image-upload"] input[type="file"]',
      '[class*="upload"] input[type="file"]'
    ],
    publishButton: [
      'button:contains("发布")',
      '[data-testid="publish-button"]',
      '[class*="publish"] button'
    ],
    loginIndicator: [
      '.creator-home',
      '.publish-entry',
      '[data-testid="user-avatar"]'
    ],
    loginQrCode: [
      '.login-qrcode',
      '.login-form'
    ]
  }
}
