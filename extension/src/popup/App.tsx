import { useEffect, useState } from 'react'
import { createNewPublishToken, getPublishToken, openWebAppLogin } from '@/shared/auth'
import { STORAGE_KEYS, WEB_APP_URL } from '@/shared/constants'
import { getStorageItem, setStorageItem } from '@/shared/storage'
import type { PublishTask, UserInfo } from '@/shared/types'
import { formatRelativeTime, taskStatusText } from '@/shared/utils'

export default function App() {
  const [tasks, setTasks] = useState<PublishTask[]>([])
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    // 监听 storage 变化，实时更新任务列表
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes[STORAGE_KEYS.PENDING_TASKS]) {
        setTasks(changes[STORAGE_KEYS.PENDING_TASKS].newValue || [])
      }
    }
    chrome.storage.local.onChanged.addListener(listener)
    return () => chrome.storage.local.onChanged.removeListener(listener)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 确保 token 有效
      let token = await getPublishToken()
      if (!token) {
        token = await createNewPublishToken()
      }

      if (!token) {
        setError('未登录')
        setLoading(false)
        return
      }

      // 拉取最新任务
      await chrome.runtime.sendMessage({ type: 'CHECK_NOW' })

      const pendingTasks = (await getStorageItem<PublishTask[]>(STORAGE_KEYS.PENDING_TASKS)) || []
      const storedUser = await getStorageItem<UserInfo>(STORAGE_KEYS.USER_INFO)

      setTasks(pendingTasks)
      setUser(storedUser)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenPublishPage = async (taskId: string) => {
    try {
      await chrome.runtime.sendMessage({ type: 'OPEN_PUBLISH_PAGE', taskId })
    } catch (err) {
      console.error('打开发布页失败', err)
    }
  }

  const handleOpenWebApp = () => {
    chrome.tabs.create({ url: WEB_APP_URL })
  }

  const handleLogin = () => {
    openWebAppLogin()
  }

  const handleLogout = async () => {
    await setStorageItem(STORAGE_KEYS.PUBLISH_TOKEN, null)
    await setStorageItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, null)
    await setStorageItem(STORAGE_KEYS.USER_INFO, null)
    setUser(null)
    setTasks([])
  }

  const pendingTasks = tasks.filter(t => !['published', 'cancelled', 'failed', 'expired'].includes(t.status))
  const recentTasks = tasks.filter(t => ['published', 'cancelled', 'failed', 'expired'].includes(t.status))

  if (loading) {
    return (
      <div className="w-[360px] min-h-[400px] flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-xhs-red/30 border-t-xhs-red rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  if (error === '未登录') {
    return (
      <div className="w-[360px] p-6 bg-white">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">用户未登录</h2>
          <p className="text-sm text-gray-500 mb-4">请先在 Web App 登录，扩展将自动同步您的账号。</p>
          <button onClick={handleLogin} className="xhs-btn-primary w-full">打开 Web App 登录</button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[360px] min-h-[400px] bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-900">小红书运营助手</h1>
          <p className="text-xs text-gray-500">{user?.email || '未登录用户'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="text-gray-400 hover:text-gray-600" title="刷新">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600" title="退出登录">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>

      {/* Pending Tasks */}
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">待处理（{pendingTasks.length}）</h2>

        {pendingTasks.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm text-gray-500">暂无待发布任务</p>
            <p className="text-xs text-gray-400 mt-1">在 Web App 生成笔记后点击“发布到小红书”</p>
            <button onClick={handleOpenWebApp} className="mt-3 xhs-btn-secondary text-xs py-1.5 px-3">
              打开 Web App
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTasks.map(task => (
              <TaskCard key={task.id} task={task} onPublish={() => handleOpenPublishPage(task.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Tasks */}
      {recentTasks.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">最近 7 天</h2>
          <div className="space-y-3">
            {recentTasks.slice(0, 3).map(task => (
              <TaskCard key={task.id} task={task} onPublish={() => handleOpenPublishPage(task.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface TaskCardProps {
  task: PublishTask
  onPublish: () => void
}

function TaskCard({ task, onPublish }: TaskCardProps) {
  const isTerminal = ['published', 'cancelled', 'failed', 'expired'].includes(task.status)

  const statusColorMap: Record<string, string> = {
    pending: 'border-l-red-500 bg-red-50',
    fetched: 'border-l-red-400 bg-red-50',
    prefilling: 'border-l-yellow-500 bg-yellow-50',
    waiting_user: 'border-l-orange-500 bg-orange-50',
    published: 'border-l-green-500 bg-green-50',
    cancelled: 'border-l-gray-400 bg-gray-50',
    failed: 'border-l-gray-500 bg-gray-50',
    expired: 'border-l-gray-300 bg-gray-50'
  }
  const statusColor = statusColorMap[task.status] || 'border-l-gray-300 bg-gray-50' 

  return (
    <div className={`border-l-4 rounded-r-lg p-3 ${statusColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{task.content.selected_title}</p>
          <p className="text-xs text-gray-500 mt-1">
            {taskStatusText(task.status)} · {formatRelativeTime(task.created_at)}
          </p>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        {!isTerminal ? (
          <button onClick={onPublish} className="flex-1 bg-xhs-red text-white text-xs font-medium py-1.5 rounded hover:bg-xhs-red-dark transition">
            去发布
          </button>
        ) : (
          <>
            <button onClick={onPublish} className="flex-1 bg-white border border-gray-300 text-gray-700 text-xs font-medium py-1.5 rounded hover:bg-gray-50 transition">
              重新发布
            </button>
          </>
        )}
      </div>
    </div>
  )
}
