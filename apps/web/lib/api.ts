import { GenerateRequest, GenerateResponse, HistoryItem } from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

let authToken: string | null = null

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `请求失败 (HTTP ${res.status})`
    try {
      const err = await res.json()
      if (err.detail) {
        message = err.detail
      } else if (err.error) {
        message = err.error
      } else {
        message = JSON.stringify(err)
      }
    } catch {
      const text = await res.text()
      if (text) message = text
    }
    throw new Error(message)
  }
  return res.json()
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  return headers
}

export async function login(email: string = "demo@example.com", password: string = "demo"): Promise<string> {
  const params = new URLSearchParams()
  params.set('username', email)
  params.set('password', password)

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const data = await handleResponse<{ access_token: string }>(res)
  authToken = data.access_token
  return authToken
}

export async function generateNote(request: GenerateRequest): Promise<GenerateResponse> {
  // 优先使用已登录的 /generate 接口（保存历史记录）
  const endpoint = authToken ? '/generate' : '/generate/anonymous'
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  })
  return handleResponse(res)
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE_URL}/health`)
  if (!res.ok) throw new Error('Failed to fetch health')
  return res.json()
}

// History APIs
export async function fetchHistory(keyword?: string, favoriteOnly?: boolean): Promise<HistoryItem[]> {
  const params = new URLSearchParams()
  if (keyword) params.set('keyword', keyword)
  if (favoriteOnly) params.set('favorite_only', 'true')

  const res = await fetch(`${API_BASE_URL}/history?${params.toString()}`, {
    headers: getHeaders(),
  })
  return handleResponse(res)
}

export async function toggleFavorite(id: string, isFavorite: boolean): Promise<HistoryItem> {
  const res = await fetch(`${API_BASE_URL}/history/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ is_favorite: isFavorite }),
  })
  return handleResponse(res)
}

export async function deleteHistory(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/history/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  await handleResponse(res)
}
