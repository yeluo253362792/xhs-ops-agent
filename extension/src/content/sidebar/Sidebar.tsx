import { useEffect, useState } from 'react'
import { cancelTask } from '@/shared/api'
import { getPublishToken } from '@/shared/auth'
import type { FieldStatus, FillResult, PublishTask, TaskLog } from '@/shared/types'
import { fieldStatusIcon, formatRelativeTime, taskStatusText } from '@/shared/utils'
import { copyToClipboard, fillAll } from '@/content/filler'
import { isLoggedIn } from '@/content/platform/xiaohongshu'

interface SidebarProps {
  task: PublishTask
  onClose: () => void
  onMinimize: () => void
}

export default function Sidebar({ task, onClose, onMinimize }: SidebarProps) {
  const [results, setResults] = useState<Record<string, { status: FieldStatus; message?: string }>>({
    title: { status: 'pending' },
    body: { status: 'pending' },
    tags: { status: 'pending' },
    images: { status: task.images?.length ? 'pending' : 'skipped' }
  })
  const [logs, setLogs] = useState<TaskLog[]>([])
  const [isFilling, setIsFilling] = useState(false)
  const [currentAccount, setCurrentAccount] = useState<string>('检测中...')
  const [loginRequired, setLoginRequired] = useState(false)

  useEffect(() => {
    checkLoginState()
    // 自动开始填充
    handleFill()
  }, [task])

  const checkLoginState = async () => {
    const loggedIn = await isLoggedIn()
    if (!loggedIn) {
      setLoginRequired(true)
      setCurrentAccount('未登录')
    } else {
      setLoginRequired(false)
      // 尝试读取页面中的用户名，失败则显示默认
      const accountEl = document.querySelector('[data-testid="user-nickname"], .user-name, .account-name')
      setCurrentAccount(accountEl?.textContent?.trim() || '已登录账号')
    }
  }

  const handleFill = async () => {
    if (loginRequired) return

    setIsFilling(true)
    setResults({
      title: { status: 'filling' },
      body: { status: 'filling' },
      tags: { status: 'filling' },
      images: task.images?.length ? { status: 'filling' } : { status: 'skipped' }
    })

    const { success, results: fillResults, logs: fillLogs } = await fillAll(task)

    const newResults: Record<string, { status: FieldStatus; message?: string }> = {}
    fillResults.forEach((r: FillResult) => {
      newResults[r.field] = { status: r.status, message: r.message }
    })
    setResults(newResults)
    setLogs(fillLogs)
    setIsFilling(false)

    // 上报状态
    const progress: Record<string, string> = {}
    fillResults.forEach((r: FillResult) => {
      progress[r.field] = r.status
    })

    const nextStatus = success ? 'waiting_user' : 'waiting_user'
    await reportStatus(nextStatus, progress, fillLogs)
  }

  const reportStatus = async (
    status: string,
    progress?: Record<string, string>,
    logs?: TaskLog[]
  ) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'TASK_STATUS_UPDATED',
        taskId: task.id,
        status,
        progress,
        logs: logs?.map(l => ({ time: l.time, level: l.level, message: l.message }))
      })
    } catch (err) {
      console.error('[XHS Sidebar] 上报状态失败', err)
    }
  }

  const handleCopyField = async (field: string) => {
    let text = ''
    switch (field) {
      case 'title':
        text = task.content.selected_title
        break
      case 'body':
        text = task.content.body
        break
      case 'tags':
        text = task.content.tags.map((t: string) => (t.startsWith('#') ? t : `#${t}`)).join(' ')
        break
    }
    const ok = await copyToClipboard(text)
    if (ok) {
      addLog('info', `已复制${field}到剪贴板`)
    }
  }

  const handleManualComplete = async () => {
    await reportStatus('published', undefined, [...logs, { time: new Date().toISOString(), level: 'info', message: '用户确认手动完成' }])
    onClose()
  }

  const handleCancel = async () => {
    const token = await getPublishToken()
    if (token) {
      try {
        await cancelTask(token, task.id)
      } catch (err) {
        console.error('取消任务失败', err)
      }
    }
    await reportStatus('cancelled', undefined, [...logs, { time: new Date().toISOString(), level: 'info', message: '用户取消任务' }])
    onClose()
  }

  const addLog = (level: TaskLog['level'], message: string) => {
    setLogs(prev => [...prev, { time: new Date().toISOString(), level, message }])
  }

  if (loginRequired) {
    return (
      <div className="xhs-sidebar-panel">
        <div className="p-4">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="font-bold text-gray-900 mb-2">未登录小红书</h3>
            <p className="text-sm text-gray-600 mb-4">请使用当前页面登录小红书账号，登录完成后扩展将自动继续。</p>
            <button
              onClick={async () => { await checkLoginState(); if (!loginRequired) await handleFill() }}
              className="xhs-btn-primary w-full"
            >
              我已登录，继续
            </button>
            <button onClick={handleCancel} className="xhs-btn-secondary w-full mt-2">
              取消任务
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="xhs-sidebar-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">小红书运营助手</h3>
        <div className="flex gap-2">
          <button onClick={onMinimize} className="text-gray-400 hover:text-gray-600 text-lg leading-none">−</button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
      </div>

      {/* Account */}
      <div className="px-4 py-3 bg-red-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-xhs-red text-white flex items-center justify-center text-xs">小</div>
          <div>
            <p className="text-xs text-gray-600">当前账号</p>
            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{currentAccount}</p>
          </div>
        </div>
      </div>

      {/* Task Info */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-900 truncate">{task.content.selected_title}</p>
        <p className="text-xs text-orange-600 mt-1">
          {taskStatusText('waiting_user')} · {formatRelativeTime(task.created_at)}
        </p>
      </div>

      {/* Progress */}
      <div className="xhs-sidebar-scroll px-4 py-3 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">自动填充进度</h4>
        <div className="space-y-4">
          <FieldItem
            label="标题"
            field="title"
            status={results.title?.status || 'pending'}
            message={results.title?.message}
            preview={task.content.selected_title}
            onCopy={() => handleCopyField('title')}
          />
          <FieldItem
            label="正文"
            field="body"
            status={results.body?.status || 'pending'}
            message={results.body?.message}
            preview={task.content.body.slice(0, 60) + (task.content.body.length > 60 ? '...' : '')}
            onCopy={() => handleCopyField('body')}
          />
          <FieldItem
            label="标签"
            field="tags"
            status={results.tags?.status || 'pending'}
            message={results.tags?.message}
            preview={task.content.tags.map((t: string) => (t.startsWith('#') ? t : `#${t}`)).join(' ')}
            onCopy={() => handleCopyField('tags')}
          />
          <FieldItem
            label="图片"
            field="images"
            status={results.images?.status || 'pending'}
            message={results.images?.message}
            preview={task.images?.length ? `${task.images.length} 张图片` : '无图片'}
            imagePreviews={task.images}
          />
        </div>
      </div>

      {/* Logs */}
      <div className="px-4 py-3 border-b border-gray-100" style={{ maxHeight: '120px', overflowY: 'auto' }}>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">操作日志</h4>
        <div className="text-xs text-gray-500 space-y-1">
          {logs.length === 0 && <p>等待开始...</p>}
          {logs.map((log, idx) => (
            <p key={idx} className={log.level === 'error' ? 'text-red-500' : ''}>
              {new Date(log.time).toLocaleTimeString('zh-CN')} {log.message}
            </p>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2">
        <button
          onClick={handleFill}
          disabled={isFilling}
          className="w-full xhs-btn-primary disabled:opacity-50"
        >
          {isFilling ? '填充中...' : '重新一键填充'}
        </button>
        <button
          onClick={handleManualComplete}
          className="w-full xhs-btn-secondary"
        >
          我已手动完成，继续发布
        </button>
        <button
          onClick={handleCancel}
          className="w-full xhs-btn-secondary text-gray-500"
        >
          取消任务
        </button>
      </div>
    </div>
  )
}

interface FieldItemProps {
  label: string
  field: string
  status: FieldStatus
  message?: string
  preview: string
  onCopy?: () => void
  imagePreviews?: { url: string; filename: string }[]
}

function FieldItem({ label, status, message, preview, onCopy, imagePreviews }: FieldItemProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{fieldStatusIcon(status)}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <p className="text-xs text-gray-600 pl-6 truncate" title={preview}>{preview}</p>
      {message && <p className={`text-xs pl-6 mt-1 ${status === 'failed' ? 'text-red-500' : 'text-gray-500'}`}>{message}</p>}
      {status === 'failed' && onCopy && (
        <button onClick={onCopy} className="ml-6 mt-1 text-xs text-xhs-red hover:underline">
          复制{label}
        </button>
      )}
      {imagePreviews && imagePreviews.length > 0 && status !== 'skipped' && (
        <div className="ml-6 mt-2 flex gap-1 flex-wrap">
          {imagePreviews.map((img, idx) => (
            <div key={idx} className="w-10 h-10 bg-gray-100 rounded overflow-hidden">
              <img src={img.url} alt={img.filename} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
