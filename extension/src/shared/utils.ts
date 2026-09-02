import type { FieldStatus, TaskStatus } from './types'

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString('zh-CN')
}

export function isTokenExpired(expiresAt: number | null, bufferSeconds = 60): boolean {
  if (!expiresAt) return true
  return Date.now() >= (expiresAt - bufferSeconds * 1000)
}

export function fieldStatusIcon(status: FieldStatus): string {
  switch (status) {
    case 'pending': return '⏳'
    case 'filling': return '🔄'
    case 'success': return '✅'
    case 'failed': return '❌'
    case 'skipped': return '⏭️'
    default: return '⏳'
  }
}

export function fieldStatusText(status: FieldStatus): string {
  switch (status) {
    case 'pending': return '等待填充'
    case 'filling': return '填充中...'
    case 'success': return '已填充'
    case 'failed': return '填充失败'
    case 'skipped': return '已跳过'
    default: return '等待填充'
  }
}

export function taskStatusText(status: TaskStatus): string {
  switch (status) {
    case 'pending': return '待处理'
    case 'fetched': return '已拉取'
    case 'prefilling': return '填充中'
    case 'waiting_user': return '等待用户确认'
    case 'published': return '已发布'
    case 'cancelled': return '已取消'
    case 'failed': return '失败'
    case 'expired': return '已过期'
    default: return '未知'
  }
}

export function isTerminalStatus(status: TaskStatus): boolean {
  return ['published', 'cancelled', 'failed', 'expired'].includes(status)
}
