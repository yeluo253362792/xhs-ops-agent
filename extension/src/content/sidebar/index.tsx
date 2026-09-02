import { createRoot, type Root } from 'react-dom/client'
import { STORAGE_KEYS } from '@/shared/constants'
import { getStorageItem, setStorageItem } from '@/shared/storage'
import type { PublishTask } from '@/shared/types'
import Sidebar from './Sidebar'

let sidebarRoot: Root | null = null
let sidebarContainer: HTMLElement | null = null
let floatButton: HTMLElement | null = null

export async function mountSidebar(task: PublishTask): Promise<void> {
  if (sidebarContainer) {
    // 已存在则更新
    renderSidebar(task)
    return
  }

  // 创建侧边栏容器
  sidebarContainer = document.createElement('div')
  sidebarContainer.id = 'xhs-ops-agent-sidebar'
  sidebarContainer.className = 'xhs-sidebar-container'
  document.body.appendChild(sidebarContainer)

  renderSidebar(task)
  hideFloatButton()
}

export function unmountSidebar(): void {
  if (sidebarRoot) {
    sidebarRoot.unmount()
    sidebarRoot = null
  }
  if (sidebarContainer && sidebarContainer.parentNode) {
    sidebarContainer.parentNode.removeChild(sidebarContainer)
    sidebarContainer = null
  }
  showFloatButton()
}

export function minimizeSidebar(): void {
  if (sidebarContainer) {
    sidebarContainer.style.display = 'none'
  }
  showFloatButton()
}

function renderSidebar(task: PublishTask): void {
  if (!sidebarContainer) return

  if (!sidebarRoot) {
    sidebarRoot = createRoot(sidebarContainer)
  }

  sidebarContainer.style.display = 'block'
  sidebarRoot.render(
    <Sidebar
      task={task}
      onClose={() => {
        unmountSidebar()
        clearActiveTask()
      }}
      onMinimize={() => {
        minimizeSidebar()
      }}
    />
  )
}

function showFloatButton(): void {
  if (floatButton) {
    floatButton.style.display = 'flex'
    return
  }

  floatButton = document.createElement('div')
  floatButton.id = 'xhs-ops-agent-float'
  floatButton.className = 'xhs-float-button'
  floatButton.innerHTML = '✨'
  floatButton.title = '小红书运营助手'
  floatButton.addEventListener('click', async () => {
    const activeTaskId = await getStorageItem<string>(STORAGE_KEYS.ACTIVE_TASK_ID)
    if (activeTaskId && sidebarContainer) {
      sidebarContainer.style.display = 'block'
      hideFloatButton()
    } else {
      // 没有 active 任务，打开 popup
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' }).catch(() => {})
    }
  })
  document.body.appendChild(floatButton)
}

function hideFloatButton(): void {
  if (floatButton) {
    floatButton.style.display = 'none'
  }
}

async function clearActiveTask(): Promise<void> {
  await setStorageItem(STORAGE_KEYS.ACTIVE_TASK_ID, null)
}
