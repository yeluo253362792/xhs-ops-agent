import { STORAGE_KEYS } from './constants'

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

export async function getStorageItem<T>(key: StorageKey): Promise<T | null> {
  try {
    const result = await chrome.storage.local.get(key)
    return result[key] ?? null
  } catch {
    return null
  }
}

export async function setStorageItem<T>(key: StorageKey, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

export async function removeStorageItem(key: StorageKey): Promise<void> {
  await chrome.storage.local.remove(key)
}

export async function clearExtensionStorage(): Promise<void> {
  await chrome.storage.local.clear()
}
