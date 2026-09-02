import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchPendingTasks, updateTaskStatus, ApiRequestError } from '@/shared/api'

describe('api', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchPendingTasks', () => {
    it('should return pending tasks', async () => {
      const mockTasks = {
        tasks: [
          {
            id: 'task-1',
            status: 'pending',
            platform: 'xiaohongshu',
            content: {
              titles: ['标题1'],
              selected_title: '标题1',
              body: '正文',
              tags: ['标签']
            },
            images: [],
            is_ai_generated: true,
            created_at: new Date().toISOString()
          }
        ]
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTasks
      } as Response)

      const result = await fetchPendingTasks('token123')
      expect(result.tasks).toHaveLength(1)
      expect(result.tasks[0].id).toBe('task-1')
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/publish-tasks/pending',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer token123'
          })
        })
      )
    })

    it('should throw ApiRequestError on failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { code: 'UNAUTHORIZED', message: '未授权' } })
      } as Response)

      await expect(fetchPendingTasks('bad-token')).rejects.toThrow(ApiRequestError)
    })
  })

  describe('updateTaskStatus', () => {
    it('should update task status', async () => {
      const mockTask = {
        id: 'task-1',
        status: 'waiting_user'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTask
      } as Response)

      const result = await updateTaskStatus('token123', 'task-1', {
        status: 'waiting_user',
        progress: { title: 'success' }
      })

      expect(result.status).toBe('waiting_user')
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/publish-tasks/task-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            status: 'waiting_user',
            progress: { title: 'success' }
          })
        })
      )
    })
  })
})
