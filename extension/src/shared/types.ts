export type TaskStatus =
  | 'pending'
  | 'fetched'
  | 'prefilling'
  | 'waiting_user'
  | 'published'
  | 'cancelled'
  | 'failed'
  | 'expired'

export type FieldStatus = 'pending' | 'filling' | 'success' | 'failed' | 'skipped'

export interface TaskContent {
  titles: string[]
  selected_title: string
  body: string
  tags: string[]
  cover_text?: string
}

export interface TaskImage {
  url: string
  filename: string
  mime_type?: string
  is_cover?: boolean
}

export interface PublishTask {
  id: string
  status: TaskStatus
  platform: string
  content: TaskContent
  images: TaskImage[]
  is_ai_generated: boolean
  created_at: string
}

export interface TaskProgress {
  title?: FieldStatus
  body?: FieldStatus
  tags?: FieldStatus
  images?: FieldStatus
}

export interface TaskLog {
  time: string
  level: 'info' | 'warning' | 'error' | 'critical'
  message: string
}

export interface ExtensionState {
  publishToken: string | null
  tokenExpiresAt: number | null
  pendingTasks: PublishTask[]
  activeTaskId: string | null
  user: UserInfo | null
  lastPollAt: number | null
}

export interface UserInfo {
  id: string
  email: string
  nickname?: string
  subscription_tier: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface SelectorConfig {
  version: string
  updated_at: string
  selectors: Record<string, string[]>
}

export interface FillResult {
  field: string
  status: FieldStatus
  message?: string
}
