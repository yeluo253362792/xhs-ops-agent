import { describe, it, expect } from 'vitest'
import {
  generateId,
  formatRelativeTime,
  isTokenExpired,
  fieldStatusIcon,
  taskStatusText,
  isTerminalStatus
} from '@/shared/utils'

describe('utils', () => {
  describe('generateId', () => {
    it('should generate unique ids', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
      expect(id1).toContain('-')
    })
  })

  describe('formatRelativeTime', () => {
    it('should return 刚刚 for recent time', () => {
      const now = new Date().toISOString()
      expect(formatRelativeTime(now)).toBe('刚刚')
    })

    it('should return minutes ago', () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60000).toISOString()
      expect(formatRelativeTime(fiveMinsAgo)).toBe('5 分钟前')
    })

    it('should return hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString()
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 小时前')
    })
  })

  describe('isTokenExpired', () => {
    it('should return true when expiresAt is null', () => {
      expect(isTokenExpired(null)).toBe(true)
    })

    it('should return true when token is expired', () => {
      expect(isTokenExpired(Date.now() - 1000)).toBe(true)
    })

    it('should return false when token is valid', () => {
      expect(isTokenExpired(Date.now() + 120000)).toBe(false)
    })

    it('should consider buffer time', () => {
      expect(isTokenExpired(Date.now() + 30000, 60)).toBe(true)
    })
  })

  describe('fieldStatusIcon', () => {
    it('should return correct icons', () => {
      expect(fieldStatusIcon('success')).toBe('✅')
      expect(fieldStatusIcon('failed')).toBe('❌')
      expect(fieldStatusIcon('pending')).toBe('⏳')
    })
  })

  describe('taskStatusText', () => {
    it('should return correct Chinese text', () => {
      expect(taskStatusText('published')).toBe('已发布')
      expect(taskStatusText('waiting_user')).toBe('等待用户确认')
      expect(taskStatusText('unknown' as never)).toBe('未知')
    })
  })

  describe('isTerminalStatus', () => {
    it('should return true for terminal statuses', () => {
      expect(isTerminalStatus('published')).toBe(true)
      expect(isTerminalStatus('cancelled')).toBe(true)
      expect(isTerminalStatus('pending')).toBe(false)
    })
  })
})
