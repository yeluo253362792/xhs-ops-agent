import { STORAGE_KEYS } from '@/shared/constants'
import { getStorageItem, setStorageItem } from '@/shared/storage'
import type { PublishTask } from '@/shared/types'
import { detectPageType } from './platform/xiaohongshu'
import { minimizeSidebar, mountSidebar, unmountSidebar } from './sidebar'
import './sidebar/Sidebar.css'

const SIDEBAR_CONTAINER_ID = 'xhs-ops-agent-sidebar'

async function init(): Promise<void> {
  const pageType = await detectPageType()
  console.log('[XHS Content] 页面类型:', pageType)

  if (pageType === 'publish') {
    // 在发布页，检查是否有 active 任务
    const activeTaskId = await getStorageItem<string>(STORAGE_KEYS.ACTIVE_TASK_ID)
    if (activeTaskId) {
      await loadAndRenderTask(activeTaskId)
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
}

async function handleMessage(message: { type: string; taskId?: string }): Promise<unknown> {
  switch (message.type) {
    case 'MOUNT_SIDEBAR':
      if (message.taskId) {
        await setStorageItem(STORAGE_KEYS.ACTIVE_TASK_ID, message.taskId)
        await loadAndRenderTask(message.taskId)
      }
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

async function loadAndRenderTask(taskId: string): Promise<void> {
  const pendingTasks = (await getStorageItem<PublishTask[]>(STORAGE_KEYS.PENDING_TASKS)) || []
  const task = pendingTasks.find((t: PublishTask) => t.id === taskId)

  if (!task) {
    console.warn('[XHS Content] 未找到任务:', taskId)
    return
  }

  // 确保页面在发布页
  if (!window.location.href.includes('/publish')) {
    return
  }

  await mountSidebar(task)
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
