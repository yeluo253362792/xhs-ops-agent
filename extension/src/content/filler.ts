import type { FillResult, PublishTask, TaskLog } from '@/shared/types'
import { getSelectors, waitForElement } from './platform/xiaohongshu'

export interface FillAllResult {
  success: boolean
  results: FillResult[]
  logs: TaskLog[]
}

export async function fillAll(task: PublishTask): Promise<FillAllResult> {
  const selectors = await getSelectors()
  const logs: TaskLog[] = []
  const results: FillResult[] = []

  const log = (level: TaskLog['level'], message: string) => {
    const entry = { time: new Date().toISOString(), level, message }
    logs.push(entry)
    console.log(`[XHS Filler] ${message}`)
  }

  // 1. 填充标题
  log('info', '开始填充标题')
  const titleResult = await fillTitle(selectors.selectors.titleInput, task.content.selected_title)
  results.push(titleResult)
  log(titleResult.status === 'success' ? 'info' : 'error', titleResult.message || `标题${titleResult.status === 'success' ? '成功' : '失败'}`)

  // 2. 填充正文
  log('info', '开始填充正文')
  const bodyResult = await fillBody(selectors.selectors.bodyTextarea, task.content.body)
  results.push(bodyResult)
  log(bodyResult.status === 'success' ? 'info' : 'error', bodyResult.message || `正文${bodyResult.status === 'success' ? '成功' : '失败'}`)

  // 3. 填充标签
  log('info', '开始填充标签')
  const tagsResult = await fillTags(selectors.selectors.tagInput, task.content.tags)
  results.push(tagsResult)
  log(tagsResult.status === 'success' ? 'info' : 'error', tagsResult.message || `标签${tagsResult.status === 'success' ? '成功' : '失败'}`)

  // 4. 上传图片
  if (task.images && task.images.length > 0) {
    log('info', `开始上传 ${task.images.length} 张图片`)
    const imagesResult = await uploadImages(selectors.selectors.imageUpload, task.images)
    results.push(imagesResult)
    log(imagesResult.status === 'success' ? 'info' : 'error', imagesResult.message || `图片${imagesResult.status === 'success' ? '成功' : '失败'}`)
  } else {
    results.push({ field: 'images', status: 'skipped', message: '无图片需要上传' })
    log('info', '无图片需要上传')
  }

  const success = results.every(r => r.status === 'success' || r.status === 'skipped')
  return { success, results, logs }
}

async function fillTitle(selectors: string[], title: string): Promise<FillResult> {
  const el = await waitForElement(selectors, 3000)
  if (!el) {
    return { field: 'title', status: 'failed', message: '未找到标题输入框' }
  }

  try {
    const htmlEl = el as HTMLElement
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.focus()
      el.value = title
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      el.blur()
    } else if (htmlEl.isContentEditable) {
      htmlEl.textContent = title
      htmlEl.dispatchEvent(new InputEvent('input', { bubbles: true }))
    }
    return { field: 'title', status: 'success', message: '标题填充成功' }
  } catch (err) {
    return { field: 'title', status: 'failed', message: `填充失败: ${err instanceof Error ? err.message : '未知错误'}` }
  }
}

async function fillBody(selectors: string[], body: string): Promise<FillResult> {
  const el = await waitForElement(selectors, 3000)
  if (!el) {
    return { field: 'body', status: 'failed', message: '未找到正文输入框' }
  }

  try {
    const htmlEl = el as HTMLElement
    if (el instanceof HTMLTextAreaElement) {
      el.focus()
      el.value = body
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      el.blur()
    } else if (htmlEl.isContentEditable) {
      htmlEl.focus()
      // 使用 execCommand 以兼容部分富文本编辑器
      document.execCommand('selectAll', false)
      document.execCommand('insertText', false, body)
      htmlEl.dispatchEvent(new InputEvent('input', { bubbles: true }))
      htmlEl.blur()
    }
    return { field: 'body', status: 'success', message: '正文填充成功' }
  } catch (err) {
    return { field: 'body', status: 'failed', message: `填充失败: ${err instanceof Error ? err.message : '未知错误'}` }
  }
}

async function fillTags(selectors: string[], tags: string[]): Promise<FillResult> {
  const el = await waitForElement(selectors, 3000)
  if (!el) {
    return { field: 'tags', status: 'failed', message: '未找到标签输入框' }
  }

  try {
    const tagText = tags.map(t => (t.startsWith('#') ? t : `#${t}`)).join(' ')

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.focus()
      el.value = tagText
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }))
      el.blur()
    }
    return { field: 'tags', status: 'success', message: '标签填充成功' }
  } catch (err) {
    return { field: 'tags', status: 'failed', message: `填充失败: ${err instanceof Error ? err.message : '未知错误'}` }
  }
}

async function uploadImages(selectors: string[], images: { url: string; filename: string }[]): Promise<FillResult> {
  const el = await waitForElement(selectors, 3000)
  if (!el) {
    return { field: 'images', status: 'failed', message: '未找到图片上传输入框' }
  }

  if (!(el instanceof HTMLInputElement) || el.type !== 'file') {
    return { field: 'images', status: 'failed', message: '找到的元素不是文件输入框' }
  }

  try {
    const files: File[] = []
    for (const image of images) {
      try {
        const response = await fetch(image.url)
        if (!response.ok) {
          return { field: 'images', status: 'failed', message: `下载图片失败: ${image.filename}` }
        }
        const blob = await response.blob()
        const filename = image.filename || `image-${Date.now()}.jpg`
        files.push(new File([blob], filename, { type: blob.type || 'image/jpeg' }))
      } catch (err) {
        return { field: 'images', status: 'failed', message: `下载图片异常: ${err instanceof Error ? err.message : '未知错误'}` }
      }
    }

    const dataTransfer = new DataTransfer()
    files.forEach(f => dataTransfer.items.add(f))

    el.files = dataTransfer.files
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new Event('input', { bubbles: true }))

    return { field: 'images', status: 'success', message: `成功上传 ${files.length} 张图片` }
  } catch (err) {
    return { field: 'images', status: 'failed', message: `上传失败: ${err instanceof Error ? err.message : '未知错误'}` }
  }
}

export function copyToClipboard(text: string): Promise<boolean> {
  return new Promise(resolve => {
    navigator.clipboard.writeText(text).then(
      () => resolve(true),
      () => {
        // fallback
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        try {
          document.execCommand('copy')
          resolve(true)
        } catch {
          resolve(false)
        }
        document.body.removeChild(textarea)
      }
    )
  })
}
