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
