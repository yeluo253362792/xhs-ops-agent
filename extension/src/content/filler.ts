import type { FillResult, PublishTask, TaskLog } from '@/shared/types'
import { getSelectors, waitForElement, findElement } from './platform/xiaohongshu'

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
  const tagSelectors = selectors.selectors.tagInput || []
  const tagTriggerSelectors = selectors.selectors.tagTrigger || []
  const tagsResult = await fillTags(tagSelectors, tagTriggerSelectors, task.content.tags)
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

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  if (descriptor && descriptor.set) {
    descriptor.set.call(el, value)
  } else {
    el.value = value
  }
}

function dispatchInputEvents(el: Element): void {
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.dispatchEvent(new Event('blur', { bubbles: true }))
}

async function fillTitle(selectors: string[], title: string): Promise<FillResult> {
  const el = await waitForElement(selectors, 5000)
  if (!el) {
    return { field: 'title', status: 'failed', message: '未找到标题输入框' }
  }

  try {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.focus()
      setNativeValue(el, title)
      dispatchInputEvents(el)
      el.blur()
    } else if ((el as HTMLElement).isContentEditable) {
      const htmlEl = el as HTMLElement
      htmlEl.focus()
      document.execCommand('selectAll', false)
      document.execCommand('insertText', false, title)
      htmlEl.dispatchEvent(new InputEvent('input', { bubbles: true }))
      htmlEl.blur()
    }
    return { field: 'title', status: 'success', message: '标题填充成功' }
  } catch (err) {
    return { field: 'title', status: 'failed', message: `填充失败: ${err instanceof Error ? err.message : '未知错误'}` }
  }
}

async function fillBody(selectors: string[], body: string): Promise<FillResult> {
  const el = await waitForElement(selectors, 5000)
  if (!el) {
    return { field: 'body', status: 'failed', message: '未找到正文输入框' }
  }

  try {
    if (el instanceof HTMLTextAreaElement) {
      el.focus()
      setNativeValue(el, body)
      dispatchInputEvents(el)
      el.blur()
    } else if ((el as HTMLElement).isContentEditable) {
      const htmlEl = el as HTMLElement
      htmlEl.focus()
      document.execCommand('selectAll', false)
      document.execCommand('insertText', false, body)
      htmlEl.dispatchEvent(new InputEvent('input', { bubbles: true }))
      htmlEl.blur()
    } else {
      return { field: 'body', status: 'failed', message: '正文元素不支持填充' }
    }
    return { field: 'body', status: 'success', message: '正文填充成功' }
  } catch (err) {
    return { field: 'body', status: 'failed', message: `填充失败: ${err instanceof Error ? err.message : '未知错误'}` }
  }
}

function findButtonByText(text: string): HTMLElement | null {
  const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'))
  return buttons.find(b => b.textContent?.includes(text)) as HTMLElement | null
}

async function fillTags(
  selectors: string[],
  triggerSelectors: string[],
  tags: string[]
): Promise<FillResult> {
  let el = await waitForElement(selectors, 3000)

  // 没找到输入框时，尝试点击话题/标签触发按钮，再重新查找
  if (!el && triggerSelectors.length > 0) {
    const trigger = findElement(triggerSelectors) || findButtonByText('话题') || findButtonByText('标签')
    if (trigger) {
      (trigger as HTMLElement).click()
      await new Promise(resolve => setTimeout(resolve, 500))
      el = await waitForElement(selectors, 3000)
    }
  }

  if (!el) {
    return { field: 'tags', status: 'failed', message: '未找到标签输入框' }
  }

  try {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      for (const tag of tags) {
        const normalized = tag.startsWith('#') ? tag.slice(1) : tag
        el.focus()
        setNativeValue(el, normalized)
        el.dispatchEvent(new Event('input', { bubbles: true }))

        // 模拟回车创建标签
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }))
        el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }))
        el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', bubbles: true }))

        await new Promise(resolve => setTimeout(resolve, 200))
        setNativeValue(el, '')
      }
      el.blur()
    }
    return { field: 'tags', status: 'success', message: `标签填充成功：${tags.length} 个` }
  } catch (err) {
    return { field: 'tags', status: 'failed', message: `填充失败: ${err instanceof Error ? err.message : '未知错误'}` }
  }
}

async function uploadImages(selectors: string[], images: { url: string; filename: string }[]): Promise<FillResult> {
  const el = await waitForElement(selectors, 5000)
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
