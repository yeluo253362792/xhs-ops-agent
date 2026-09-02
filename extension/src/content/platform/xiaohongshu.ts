import { PLATFORM_SELECTORS, STORAGE_KEYS } from '@/shared/constants'
import { getStorageItem } from '@/shared/storage'
import type { SelectorConfig } from '@/shared/types'

export type PageType = 'login' | 'publish' | 'home' | 'unknown'

export async function detectPageType(): Promise<PageType> {
  const url = window.location.href
  console.log('[XHS Platform] 检测 URL:', url)

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

  // 发布页和创作服务平台首页必须已登录才能访问
  if (pageType === 'publish' || pageType === 'home') {
    return true
  }

  // 明确检测到登录页二维码/表单才算未登录
  if (pageType === 'login') {
    return false
  }

  // unknown 时兜底：只要页面存在用户头像或昵称等登录标识，也视为已登录
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
    if (el) {
      console.log('[XHS Platform] 找到元素:', selector)
      return el
    }
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
        console.log('[XHS Platform] 等待元素超时:', selectors)
        resolve(null)
        return
      }

      setTimeout(check, intervalMs)
    }

    check()
  })
}
