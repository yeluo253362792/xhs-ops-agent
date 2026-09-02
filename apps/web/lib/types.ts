export interface GenerateRequest {
  topic: string
  audience: string
  content_type: string
  tone?: string
  extra_info?: string
}

export interface ImageScriptItem {
  content: string
  desc: string
  text: string
}

export interface ComplianceResult {
  level: 'low' | 'medium' | 'high'
  issues: string[]
  suggestions: string[]
}

export interface GeneratedContent {
  topic: string
  titles: string[]
  body: string
  tags: string[]
  cover_text: string
  cover_design: string[]
  image_script: ImageScriptItem[]
  publish_suggestions: string[]
}

export interface GenerateResponse {
  success: boolean
  data?: GeneratedContent
  compliance?: ComplianceResult
  error?: string
  remaining_quota?: number
}

export interface HistoryItem {
  id: string
  user_id: string
  topic: string
  audience: string
  content_type: string
  tone?: string
  generated_content: GeneratedContent
  compliance_result?: ComplianceResult
  is_favorite: boolean
  created_at: string
}

// Publish task types
export interface TaskContent {
  titles: string[]
  selected_title: string
  body: string
  tags: string[]
  cover_text?: string
}

export interface TaskImageUpload {
  upload_id: string
  filename: string
  is_cover?: boolean
}

export interface PublishTaskCreate {
  content: TaskContent
  images?: TaskImageUpload[]
  platform?: string
  note_type?: string
  is_ai_generated?: boolean
  generation_history_id?: string
}

export interface PublishTask {
  id: string
  status: string
  platform: string
  content: TaskContent
  images: Array<{
    url: string
    filename: string
    mime_type?: string
    is_cover?: boolean
  }>
  is_ai_generated: boolean
  progress: Record<string, string>
  logs: Array<{
    time: string
    level: string
    message: string
  }>
  publish_token?: string
  publish_token_expires_at?: string
  published_at?: string
  cancelled_at?: string
  failed_at?: string
  created_at: string
  updated_at: string
}

export interface ImageUploadResult {
  upload_id: string
  filename: string
  mime_type?: string
  size: number
  url: string
  is_cover: boolean
}
