import { PLATFORM_SELECTORS, STORAGE_KEYS } from '@/shared/constants'
import { getStorageItem } from '@/shared/storage'
import type { SelectorConfig } from '@/shared/types'

export type PageType = 'login' | 'publish' | 'home' | 'unknown'

export async function detectPageType(): Promise<PageType> {
  const url = window.location.href
  if (url.includes('/publish')) return 'publish'

  const selectors = await getSelectors()

  const loginSelectors = selectors.selectors.loginQrCode || []
  for (const selector of loginSelectors) {
    if (safeQuerySelector(selector)) return 'login'
  }

  const loginIndicatorSelectors = selectors.selectors.loginIndicator || []
  for (const selector of loginIndicatorSelectors) {
    if (safeQuerySelector(selector)) return 'home'
  }

  return 'unknown'
}

export async function isLoggedIn(): Promise<boolean> {
  const pageType = await detectPageType()
  if (pageType === 'login') return false

  const selectors = await getSelectors()
  const loginIndicatorSelectors = selectors.selectors.loginIndicator || []
  for (const selector of loginIndicatorSelectors) {
    if (safeQuerySelector(selector)) return true
  }

  return false
}

export function safeQuerySelector(selector: string): Element | null {
  try {
    return document.querySelector(selector)
  } catch {
    return null
  }
}

export function safeQuerySelectorAll(selector: string): Element[] {
  try {
    return Array.from(document.querySelectorAll(selector))
  } catch {
    return []
  }
}

export function findElement(selectors: string[]): Element | null {
  for (const selector of selectors) {
    const el = safeQuerySelector(selector)
    if (el) return el
  }
  return null
}

export async function getSelectors(): Promise<SelectorConfig> {
  const cached = await getStorageItem<SelectorConfig>(STORAGE_KEYS.SELECTORS)
  return cached || PLATFORM_SELECTORS
}

export function waitForElement(
  selectors: string[],
  timeoutMs = 5000,
  intervalMs = 200
): Promise<Element | null> {
  return new Promise(resolve => {
    const startTime = Date.now()

    const check = () => {
      const el = findElement(selectors)
      if (el) {
        resolve(el)
        return
      }

      if (Date.now() - startTime >= timeoutMs) {
        resolve(null)
        return
      }

      setTimeout(check, intervalMs)
    }

    check()
  })
}
