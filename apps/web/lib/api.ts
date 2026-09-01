import { GenerateRequest, GenerateResponse } from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export async function generateNote(request: GenerateRequest): Promise<GenerateResponse> {
  const res = await fetch(`${API_BASE_URL}/generate/anonymous`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || '生成失败')
  }

  return res.json()
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE_URL}/health`)
  if (!res.ok) throw new Error('Failed to fetch health')
  return res.json()
}
