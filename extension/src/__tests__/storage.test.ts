import { describe, it, expect, beforeEach, type Mock } from 'vitest'
import { getStorageItem, setStorageItem, removeStorageItem } from '@/shared/storage'
import { STORAGE_KEYS } from '@/shared/constants'

describe('storage', () => {
  const mockGet = chrome.storage.local.get as unknown as Mock
  const mockSet = chrome.storage.local.set as unknown as Mock
  const mockRemove = chrome.storage.local.remove as unknown as Mock

  beforeEach(() => {
    mockGet.mockReset()
    mockSet.mockReset()
    mockRemove.mockReset()
  })

  describe('getStorageItem', () => {
    it('should return stored value', async () => {
      mockGet.mockResolvedValue({ xhs_publish_token: 'token123' })
      const result = await getStorageItem(STORAGE_KEYS.PUBLISH_TOKEN)
      expect(result).toBe('token123')
      expect(mockGet).toHaveBeenCalledWith('xhs_publish_token')
    })

    it('should return null when key not found', async () => {
      mockGet.mockResolvedValue({})
      const result = await getStorageItem(STORAGE_KEYS.PUBLISH_TOKEN)
      expect(result).toBeNull()
    })

    it('should return null on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await getStorageItem(STORAGE_KEYS.PUBLISH_TOKEN)
      expect(result).toBeNull()
    })
  })

  describe('setStorageItem', () => {
    it('should set value', async () => {
      mockSet.mockResolvedValue(undefined)
      await setStorageItem(STORAGE_KEYS.PUBLISH_TOKEN, 'token123')
      expect(mockSet).toHaveBeenCalledWith({ xhs_publish_token: 'token123' })
    })
  })

  describe('removeStorageItem', () => {
    it('should remove value', async () => {
      mockRemove.mockResolvedValue(undefined)
      await removeStorageItem(STORAGE_KEYS.PUBLISH_TOKEN)
      expect(mockRemove).toHaveBeenCalledWith('xhs_publish_token')
    })
  })
})
