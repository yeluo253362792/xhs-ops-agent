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
      '.publish-page-content-base input.d-text',
      '.edit-container input[type="text"]',
      'input[placeholder*="标题"]',
      'textarea[placeholder*="标题"]',
      '[class*="title"] input',
      '[data-testid="note-title-input"]',
      '[class*="title"] [contenteditable="true"]'
    ],
    bodyTextarea: [
      '.tiptap.ProseMirror',
      '.editor-content [contenteditable="true"]',
      'textarea[placeholder*="正文"]',
      'div[contenteditable="true"][placeholder*="正文"]',
      'div[contenteditable="true"][placeholder*="描述"]',
      'div[contenteditable="true"][placeholder*="分享"]',
      '[class*="editor"] [contenteditable="true"]',
      '[class*="content"] [contenteditable="true"]',
      '[class*="desc"] [contenteditable="true"]',
      '[data-testid="note-content-input"]',
      '.note-editor',
      '.publish-editor',
      'div[contenteditable="true"]'
    ],
    tagInput: [
      'input[placeholder*="标签"]',
      'input[placeholder*="话题"]',
      'input[placeholder*="添加"]',
      '[class*="tag"] input[type="text"]',
      '[class*="topic"] input[type="text"]',
      '[class*="tag-input"] input',
      '[class*="topic-input"] input',
      '[data-testid="note-tag-input"]'
    ],
    tagTrigger: [
      '[class*="topic"]',
      '[class*="tag-add"]',
      '[class*="add-topic"]'
    ],
    imageUpload: [
      'input[type="file"][accept*="image"]',
      '[data-testid="image-upload"] input[type="file"]',
      '[class*="upload"] input[type="file"]'
    ],
    publishButton: [
      '[data-testid="publish-button"]',
      '[class*="publish"] button'
    ],
    loginIndicator: [
      '.creator-home',
      '.publish-entry',
      '[data-testid="user-avatar"]',
      '.user-avatar',
      '.avatar',
      '.user-name'
    ],
    loginQrCode: [
      '.login-qrcode',
      '.login-form'
    ]
  }
}
