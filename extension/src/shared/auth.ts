import { getExtensionToken, refreshExtensionToken } from './api'
import { PUBLISH_TOKEN_TTL_SECONDS, STORAGE_KEYS, WEB_APP_URL } from './constants'
import { getStorageItem, removeStorageItem, setStorageItem } from './storage'
import { isTokenExpired } from './utils'

/**
 * 从 Web App 同源 Cookie 中读取 access_token。
 * 注意：扩展需要 host_permissions 包含 Web App 域名，且 Cookie 需设置 SameSite=None; Secure。
 */
export async function getAccessTokenFromCookie(): Promise<string | null> {
  try {
    const cookies = await chrome.cookies.get({
      url: WEB_APP_URL,
      name: 'access_token'
    })
    return cookies?.value || null
  } catch {
    return null
  }
}

export async function getPublishToken(): Promise<string | null> {
  const token = await getStorageItem<string>(STORAGE_KEYS.PUBLISH_TOKEN)
  const expiresAt = await getStorageItem<number>(STORAGE_KEYS.TOKEN_EXPIRES_AT)

  if (!token) return null

  if (isTokenExpired(expiresAt)) {
    // 尝试刷新
    try {
      const refreshed = await refreshExtensionToken(token)
      await savePublishToken(refreshed.publish_token, refreshed.expires_at)
      return refreshed.publish_token
    } catch {
      // 刷新失败，尝试用 access_token 重新获取
      return createNewPublishToken()
    }
  }

  return token
}

export async function createNewPublishToken(): Promise<string | null> {
  const accessToken = await getAccessTokenFromCookie()
  if (!accessToken) return null

  try {
    const result = await getExtensionToken(accessToken)
    await savePublishToken(result.publish_token, result.expires_at)
    return result.publish_token
  } catch {
    return null
  }
}

export async function savePublishToken(token: string, expiresAt: string): Promise<void> {
  const expiresAtMs = new Date(expiresAt).getTime()
  await setStorageItem(STORAGE_KEYS.PUBLISH_TOKEN, token)
  await setStorageItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAtMs)
}

export async function clearAuth(): Promise<void> {
  await removeStorageItem(STORAGE_KEYS.PUBLISH_TOKEN)
  await removeStorageItem(STORAGE_KEYS.TOKEN_EXPIRES_AT)
  await removeStorageItem(STORAGE_KEYS.USER_INFO)
}

export function openWebAppLogin(): void {
  chrome.tabs.create({ url: `${WEB_APP_URL}/login` })
}

/**
 * 获取 token 有效期，兜底 10 分钟。
 */
export function getDefaultTokenExpiresAt(): string {
  return new Date(Date.now() + PUBLISH_TOKEN_TTL_SECONDS * 1000).toISOString()
}
