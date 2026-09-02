import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fillAll } from '@/content/filler'
import type { PublishTask } from '@/shared/types'

describe('filler', () => {
  let originalExecCommand: typeof document.execCommand

  beforeEach(() => {
    document.body.innerHTML = ''
    // jsdom 的 execCommand 不会真正修改内容，这里 mock 以验证填充逻辑
    originalExecCommand = document.execCommand
    document.execCommand = vi.fn((commandId: string, _showUI?: boolean, value?: string) => {
      const active = document.activeElement as HTMLElement | null
      if ((commandId === 'insertText' || commandId === 'selectAll') && active) {
        if (commandId === 'insertText' && value !== undefined) {
          active.innerText = value
        }
      }
      return true
    }) as unknown as typeof document.execCommand
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.execCommand = originalExecCommand
  })

  function createXiaohongshuPublishPage(title: string, body: string) {
    const container = document.createElement('div')
    container.className = 'publish-page-content-base'

    const titleInput = document.createElement('input')
    titleInput.className = 'd-text'
    titleInput.type = 'text'
    titleInput.placeholder = '填写标题会有更多赞哦'
    titleInput.value = title
    container.appendChild(titleInput)

    const editor = document.createElement('div')
    editor.className = 'tiptap ProseMirror'
    editor.setAttribute('contenteditable', 'true')
    editor.innerHTML = `<p>${body}</p>`
    container.appendChild(editor)

    document.body.appendChild(container)
  }

  it('should fill title and body for xiaohongshu and append tags to body', async () => {
    createXiaohongshuPublishPage('', '')

    const task: PublishTask = {
      id: 'task-1',
      status: 'pending',
      platform: 'xiaohongshu',
      content: {
        titles: ['标题1'],
        selected_title: '油皮夏天不爆痘',
        body: '正文内容',
        tags: ['油皮护肤', '夏季护肤']
      },
      images: [],
      is_ai_generated: true,
      created_at: new Date().toISOString()
    }

    const result = await fillAll(task)

    const titleInput = document.querySelector('input.d-text') as HTMLInputElement
    const bodyEditor = document.querySelector('.tiptap.ProseMirror') as HTMLElement

    expect(titleInput.value).toBe('油皮夏天不爆痘')
    expect(bodyEditor.textContent).toContain('正文内容')
    expect(bodyEditor.textContent).toContain('#油皮护肤#')
    expect(bodyEditor.textContent).toContain('#夏季护肤#')

    expect(result.results.find(r => r.field === 'title')?.status).toBe('success')
    expect(result.results.find(r => r.field === 'body')?.status).toBe('success')
    expect(result.results.find(r => r.field === 'tags')?.status).toBe('skipped')
    expect(result.results.find(r => r.field === 'images')?.status).toBe('skipped')
    expect(result.success).toBe(true)
  })

  it('should return failed when title input is not found', async () => {
    const editor = document.createElement('div')
    editor.className = 'tiptap ProseMirror'
    editor.setAttribute('contenteditable', 'true')
    document.body.appendChild(editor)

    const task: PublishTask = {
      id: 'task-2',
      status: 'pending',
      platform: 'xiaohongshu',
      content: {
        titles: ['标题'],
        selected_title: '标题',
        body: '正文',
        tags: []
      },
      images: [],
      is_ai_generated: true,
      created_at: new Date().toISOString()
    }

    const result = await fillAll(task)
    expect(result.results.find(r => r.field === 'title')?.status).toBe('failed')
    expect(result.results.find(r => r.field === 'body')?.status).toBe('success')
  }, 10000)
})
