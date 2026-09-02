import { API_BASE_URL } from './constants'
import type { ApiError, PublishTask, SelectorConfig } from './types'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let error: ApiError
    try {
      const data = await response.json()
      error = data.error || { code: 'UNKNOWN_ERROR', message: '未知错误' }
    } catch {
      error = { code: `HTTP_${response.status}`, message: response.statusText || '请求失败' }
    }
    throw new ApiRequestError(error)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export class ApiRequestError extends Error {
  constructor(public readonly apiError: ApiError) {
    super(apiError.message)
    this.name = 'ApiRequestError'
  }
}

async function request<T>(
  method: string,
  path: string,
  token: string | null,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  return handleResponse<T>(response)
}

export async function fetchPendingTasks(token: string): Promise<{ tasks: PublishTask[] }> {
  return request<{ tasks: PublishTask[] }>('GET', '/api/v1/publish-tasks/pending', token)
}

export async function fetchTaskDetail(token: string, taskId: string): Promise<PublishTask> {
  return request<PublishTask>('GET', `/api/v1/publish-tasks/${taskId}`, token)
}

export async function updateTaskStatus(
  token: string,
  taskId: string,
  payload: {
    status: string
    progress?: Record<string, string>
    logs?: Array<{ time: string; level: string; message: string }>
  }
): Promise<PublishTask> {
  return request<PublishTask>('PATCH', `/api/v1/publish-tasks/${taskId}`, token, payload)
}

export async function cancelTask(token: string, taskId: string): Promise<PublishTask> {
  return request<PublishTask>('POST', `/api/v1/publish-tasks/${taskId}/cancel`, token)
}

export async function fetchSelectors(token: string): Promise<SelectorConfig> {
  return request<SelectorConfig>('GET', '/api/v1/extension/selectors', token)
}

export async function reportExtensionLog(
  token: string,
  payload: {
    level: string
    message: string
    context?: Record<string, unknown>
    timestamp: string
  }
): Promise<{ received: boolean }> {
  return request<{ received: boolean }>('POST', '/api/v1/extension/logs', token, payload)
}

export async function getExtensionToken(accessToken: string): Promise<{
  publish_token: string
  expires_in: number
  expires_at: string
}> {
  return request<{ publish_token: string; expires_in: number; expires_at: string }>(
    'POST',
    '/api/v1/auth/extension-token',
    accessToken,
    { device_info: 'Chrome Extension 1.0.0' }
  )
}

export async function refreshExtensionToken(publishToken: string): Promise<{
  publish_token: string
  expires_in: number
  expires_at: string
}> {
  return request<{ publish_token: string; expires_in: number; expires_at: string }>(
    'POST',
    '/api/v1/auth/extension-token/refresh',
    publishToken
  )
}
