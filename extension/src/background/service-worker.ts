import { fetchPendingTasks, updateTaskStatus } from '@/shared/api'
import { createNewPublishToken, getPublishToken } from '@/shared/auth'
import { POLL_INTERVALS, STORAGE_KEYS } from '@/shared/constants'
import { getStorageItem, setStorageItem } from '@/shared/storage'
import type { PublishTask, TaskStatus } from '@/shared/types'

let pollTimer: ReturnType<typeof setTimeout> | null = null
let currentInterval = POLL_INTERVALS.NO_TASKS
let consecutiveErrors = 0

// 启动时开始轮询
chrome.runtime.onStartup.addListener(startPolling)
chrome.runtime.onInstalled.addListener(() => {
  startPolling()
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handle = async () => {
    switch (message.type) {
      case 'START_POLLING':
        startPolling()
        return { success: true }

      case 'STOP_POLLING':
        stopPolling()
        return { success: true }

      case 'CHECK_NOW':
        await checkPendingTasks()
        return { success: true }

      case 'OPEN_PUBLISH_PAGE':
        await openPublishPage(message.taskId)
        return { success: true }

      case 'TASK_STATUS_UPDATED':
        await handleTaskStatusUpdate(message.taskId, message.status, message.progress, message.logs)
        return { success: true }

      case 'CLEAR_BADGE':
        await chrome.action.setBadgeText({ text: '' })
        return { success: true }

      default:
        return { success: false, error: 'Unknown message type' }
    }
  }

  handle()
    .then(sendResponse)
    .catch(error => {
      sendResponse({ success: false, error: error instanceof Error ? error.message : '未知错误' })
    })

  return true
})

async function startPolling(): Promise<void> {
  stopPolling()
  currentInterval = POLL_INTERVALS.NO_TASKS
  consecutiveErrors = 0
  await checkPendingTasks()
  scheduleNextPoll()
}

function stopPolling(): void {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

function scheduleNextPoll(): void {
  pollTimer = setTimeout(() => {
    checkPendingTasks().then(scheduleNextPoll)
  }, currentInterval)
}

async function checkPendingTasks(): Promise<void> {
  try {
    let token = await getPublishToken()
    if (!token) {
      token = await createNewPublishToken()
    }

    if (!token) {
      // 未登录，降低轮询频率
      currentInterval = POLL_INTERVALS.ERROR
      return
    }

    const { tasks } = await fetchPendingTasks(token)
    consecutiveErrors = 0

    if (tasks.length > 0) {
      currentInterval = POLL_INTERVALS.HAS_TASKS
      await storePendingTasks(tasks)
      await updateBadge(tasks.length)

      const settings = (await getStorageItem<{
        notifyNewTask?: boolean
        notifyFillComplete?: boolean
      }>(STORAGE_KEYS.SETTINGS)) || {}

      if (settings.notifyNewTask !== false) {
        await notifyNewTasks(tasks)
      }
    } else {
      currentInterval = POLL_INTERVALS.NO_TASKS
      await updateBadge(0)
    }

    await setStorageItem(STORAGE_KEYS.USER_INFO, { lastPollAt: Date.now() })
  } catch (error) {
    consecutiveErrors++
    currentInterval = POLL_INTERVALS.ERROR
    console.error('[XHS Extension] 轮询任务失败', error)
  }
}

async function storePendingTasks(tasks: PublishTask[]): Promise<void> {
  const existing = (await getStorageItem<PublishTask[]>(STORAGE_KEYS.PENDING_TASKS)) || []

  // 合并，以新拉取的为准
  const merged = [...existing]
  for (const task of tasks) {
    const index = merged.findIndex((t: PublishTask) => t.id === task.id)
    if (index >= 0) {
      merged[index] = task
    } else {
      merged.push(task)
    }
  }

  // 过滤掉已终态的旧任务
  const active = merged.filter((t: PublishTask) => !['published', 'cancelled', 'failed', 'expired'].includes(t.status))
  await setStorageItem(STORAGE_KEYS.PENDING_TASKS, active)
}

async function updateBadge(count: number): Promise<void> {
  if (count > 0) {
    await chrome.action.setBadgeText({ text: count > 99 ? '99+' : String(count) })
    await chrome.action.setBadgeBackgroundColor({ color: '#FF2442' })
  } else {
    await chrome.action.setBadgeText({ text: '' })
  }
}

async function notifyNewTasks(tasks: PublishTask[]): Promise<void> {
  const latest = tasks[0]
  await chrome.notifications.create(`xhs-new-task-${latest.id}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '小红书运营助手',
    message: `您有 ${tasks.length} 条笔记等待发布：${latest.content.selected_title}`,
    buttons: [{ title: '去发布' }],
    priority: 1
  })
}

export async function openPublishPage(taskId: string): Promise<void> {
  await setStorageItem(STORAGE_KEYS.ACTIVE_TASK_ID, taskId)

  const url = 'https://creator.xiaohongshu.com/publish'
  const tabs = await chrome.tabs.query({ url: 'https://creator.xiaohongshu.com/*' })

  if (tabs.length > 0 && tabs[0].id) {
    await chrome.tabs.update(tabs[0].id, { url, active: true })
    if (tabs[0].windowId) {
      await chrome.windows.update(tabs[0].windowId, { focused: true })
    }
  } else {
    await chrome.tabs.create({ url })
  }
}

async function handleTaskStatusUpdate(
  taskId: string,
  status: TaskStatus,
  progress?: Record<string, string>,
  logs?: Array<{ time: string; level: string; message: string }>
): Promise<void> {
  const token = await getPublishToken()
  if (!token) return

  await updateTaskStatus(token, taskId, {
    status,
    progress,
    logs
  })

  // 如果任务完成，更新本地缓存
  if (['published', 'cancelled', 'failed', 'expired'].includes(status)) {
    const pending = (await getStorageItem<PublishTask[]>(STORAGE_KEYS.PENDING_TASKS)) || []
    const updated = pending.filter((t: PublishTask) => t.id !== taskId)
    await setStorageItem(STORAGE_KEYS.PENDING_TASKS, updated)
    await updateBadge(updated.length)

    if (status === 'published') {
      await chrome.notifications.create(`xhs-published-${taskId}`, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '小红书运营助手',
        message: '笔记已预填完成，请检查并点击发布',
        priority: 1
      })
    }
  }
}

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId.startsWith('xhs-new-task-') && buttonIndex === 0) {
    const taskId = notificationId.replace('xhs-new-task-', '')
    openPublishPage(taskId)
  }
})

chrome.notifications.onClicked.addListener(notificationId => {
  if (notificationId.startsWith('xhs-new-task-')) {
    const taskId = notificationId.replace('xhs-new-task-', '')
    openPublishPage(taskId)
  }
})

// 兜底：保证 service worker 不进入完全休眠
setInterval(() => {
  // no-op，仅用于保持 service worker 活跃
}, 20000)
