import { STORAGE_KEYS } from '@/shared/constants'
import { getStorageItem, setStorageItem } from '@/shared/storage'
import type { PublishTask } from '@/shared/types'
import { detectPageType } from './platform/xiaohongshu'
import { minimizeSidebar, mountSidebar, unmountSidebar } from './sidebar'
import './sidebar/Sidebar.css'

const SIDEBAR_CONTAINER_ID = 'xhs-ops-agent-sidebar'

let currentUrl = window.location.href

async function init(): Promise<void> {
  let pageType = await detectPageType()
  console.log('[XHS Content] 当前页面类型:', pageType, 'URL:', window.location.href)

  // 如果页面还在加载中，等待 1 秒后重试
  if (pageType === 'unknown') {
    await new Promise(resolve => setTimeout(resolve, 1000))
    pageType = await detectPageType()
    console.log('[XHS Content] 重试后页面类型:', pageType)
  }

  if (pageType === 'publish') {
    await tryMountSidebar()
  } else {
    // 如果不在发布页，卸载侧边栏
    if (document.getElementById(SIDEBAR_CONTAINER_ID)) {
      unmountSidebar()
      await setStorageItem(STORAGE_KEYS.ACTIVE_TASK_ID, null)
    }
  }
}

async function tryMountSidebar(): Promise<void> {
  const activeTaskId = await getStorageItem<string>(STORAGE_KEYS.ACTIVE_TASK_ID)
  console.log('[XHS Content] active task:', activeTaskId)

  if (!activeTaskId) {
    console.log('[XHS Content] 没有 active task，不显示侧边栏')
    return
  }

  if (document.getElementById(SIDEBAR_CONTAINER_ID)) {
    console.log('[XHS Content] 侧边栏已存在')
    return
  }

  await loadAndRenderTask(activeTaskId)
}

async function loadAndRenderTask(taskId: string): Promise<void> {
  const pendingTasks = (await getStorageItem<PublishTask[]>(STORAGE_KEYS.PENDING_TASKS)) || []
  const task = pendingTasks.find((t: PublishTask) => t.id === taskId)

  if (!task) {
    console.warn('[XHS Content] 未找到任务:', taskId)
    return
  }

  console.log('[XHS Content] 加载任务:', task.content.selected_title)
  await mountSidebar(task)
}

function handleUrlChange(): void {
  const newUrl = window.location.href
  if (newUrl !== currentUrl) {
    console.log('[XHS Content] URL 变化:', currentUrl, '->', newUrl)
    currentUrl = newUrl
    init()
  }
}

// 监听来自 service worker / popup 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch(error => {
      sendResponse({ success: false, error: error instanceof Error ? error.message : '未知错误' })
    })
  return true
})

async function handleMessage(message: { type: string; taskId?: string }): Promise<unknown> {
  switch (message.type) {
    case 'MOUNT_SIDEBAR':
      if (message.taskId) {
        await setStorageItem(STORAGE_KEYS.ACTIVE_TASK_ID, message.taskId)
      }
      await tryMountSidebar()
      return { success: true }

    case 'UNMOUNT_SIDEBAR':
      unmountSidebar()
      await setStorageItem(STORAGE_KEYS.ACTIVE_TASK_ID, null)
      return { success: true }

    case 'MINIMIZE_SIDEBAR':
      minimizeSidebar()
      return { success: true }

    case 'CHECK_PAGE_STATE':
      return {
        success: true,
        pageType: await detectPageType(),
        hasSidebar: !!document.getElementById(SIDEBAR_CONTAINER_ID)
      }

    default:
      return { success: false, error: 'Unknown message type' }
  }
}

// 监听 SPA 路由变化
window.addEventListener('popstate', handleUrlChange)
window.addEventListener('hashchange', handleUrlChange)

// 重写 history.pushState/replaceState 以监听 SPA 导航
const originalPushState = history.pushState
const originalReplaceState = history.replaceState

history.pushState = function (...args) {
  originalPushState.apply(this, args)
  handleUrlChange()
}

history.replaceState = function (...args) {
  originalReplaceState.apply(this, args)
  handleUrlChange()
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// 兜底：延迟再检查一次（处理 SPA 初始加载后路由变化的情况）
setTimeout(() => {
  handleUrlChange()
}, 2000)
