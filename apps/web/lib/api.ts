import { GenerateRequest, GenerateResponse } from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

async function handleResponse(res: Response): Promise<GenerateResponse> {
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

export async function generateNote(request: GenerateRequest): Promise<GenerateResponse> {
  const res = await fetch(`${API_BASE_URL}/generate/anonymous`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  return handleResponse(res)
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE_URL}/health`)
  if (!res.ok) throw new Error('Failed to fetch health')
  return res.json()
}
