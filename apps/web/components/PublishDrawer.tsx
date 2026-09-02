'use client'

import { useState, useRef } from 'react'
import { createPublishTask, uploadTempImages } from '@/lib/api'
import type { GenerateResponse, PublishTask } from '@/lib/types'
import { useExtensionDetector } from '@/hooks/useExtensionDetector'

interface PublishDrawerProps {
  isOpen: boolean
  onClose: () => void
  result: GenerateResponse
}

export default function PublishDrawer({ isOpen, onClose, result }: PublishDrawerProps) {
  const { installed: extensionInstalled, loading: extensionLoading } = useExtensionDetector()
  const [uploadedImages, setUploadedImages] = useState<Array<{
    upload_id: string
    filename: string
    url: string
    is_cover: boolean
    preview: string
  }>>([])
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createdTask, setCreatedTask] = useState<PublishTask | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen || !result.data) return null

  const data = result.data
  const selectedTitle = data.titles[0] || data.topic

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      const results = await uploadTempImages(files)
      const newImages = results.map((img, index) => ({
        upload_id: img.upload_id,
        filename: img.filename,
        url: img.url,
        is_cover: index === 0,
        preview: URL.createObjectURL(files[index]),
      }))
      setUploadedImages(prev => [...prev, ...newImages])
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片上传失败')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSetCover = (index: number) => {
    setUploadedImages(prev => prev.map((img, i) => ({
      ...img,
      is_cover: i === index
    })))
  }

  const handleCreateTask = async () => {
    setCreating(true)
    setError(null)

    try {
      const task = await createPublishTask({
        content: {
          titles: data.titles,
          selected_title: selectedTitle,
          body: data.body,
          tags: data.tags,
          cover_text: data.cover_text,
        },
        images: uploadedImages.map(img => ({
          upload_id: img.upload_id,
          filename: img.filename,
          is_cover: img.is_cover,
        })),
        platform: 'xiaohongshu',
        note_type: '图文笔记',
        is_ai_generated: true,
      })
      setCreatedTask(task)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建任务失败')
    } finally {
      setCreating(false)
    }
  }

  const handleCopyContent = () => {
    const text = `标题：${selectedTitle}\n\n正文：\n${data.body}\n\n标签：${data.tags.map(t => `#${t}`).join(' ')}`
    navigator.clipboard.writeText(text)
  }

  const handleDownloadImages = () => {
    // 下载用户上传的图片
    uploadedImages.forEach((img, index) => {
      const a = document.createElement('a')
      a.href = img.preview
      a.download = img.filename
      a.click()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">发布到小红书</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
          </div>

          {createdTask ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">发布任务已创建</h3>
              <p className="text-sm text-gray-600 mb-4">
                扩展检测到新任务后会提醒您。请点击扩展图标查看并继续发布。
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left text-sm mb-4">
                <p><span className="text-gray-500">任务 ID：</span>{createdTask.id}</p>
                <p><span className="text-gray-500">状态：</span>{createdTask.status}</p>
              </div>
              <button onClick={onClose} className="bg-xhs-red text-white font-medium rounded-xl px-6 py-2 hover:bg-xhs-red-hover transition">
                知道了
              </button>
            </div>
          ) : (
            <>
              {/* Extension Status */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${extensionLoading ? 'bg-yellow-400' : extensionInstalled ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium text-gray-700">
                    {extensionLoading ? '检测扩展中...' : extensionInstalled ? '扩展已连接' : '扩展未安装'}
                  </span>
                </div>
                {!extensionInstalled && !extensionLoading && (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-yellow-700">
                    <p className="mb-2">未检测到浏览器扩展。你可以：</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li>下载扩展安装包</li>
                      <li>打开 chrome://extensions/ 并开启开发者模式</li>
                      <li>点击“加载已解压的扩展程序”，选择 extension/dist 文件夹</li>
                    </ol>
                    <button className="mt-3 text-xhs-red font-medium hover:underline">
                      下载扩展安装包
                    </button>
                  </div>
                )}
              </div>

              {/* Content Preview */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">📋 发布内容预览</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <p><span className="text-gray-500">标题：</span>{selectedTitle}</p>
                  <p><span className="text-gray-500">类型：</span>图文笔记</p>
                  <p><span className="text-gray-500">标签：</span>{data.tags.map(t => `#${t}`).join(' ')}</p>
                </div>
              </div>

              {/* Image Upload */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">🖼️ 配图（最多 9 张）</h3>
                <div className="flex flex-wrap gap-3 mb-3">
                  {uploadedImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <div className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${img.is_cover ? 'border-xhs-red' : 'border-gray-200'}`}>
                        <img src={img.preview} alt={img.filename} className="w-full h-full object-cover" />
                      </div>
                      {img.is_cover && (
                        <span className="absolute top-0 left-0 bg-xhs-red text-white text-[10px] px-1.5 py-0.5 rounded-tl-lg rounded-br">封面</span>
                      )}
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                      <button
                        onClick={() => handleSetCover(index)}
                        className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] py-0.5 opacity-0 group-hover:opacity-100 transition"
                      >
                        设为封面
                      </button>
                    </div>
                  ))}
                  {uploadedImages.length < 9 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-xhs-red hover:text-xhs-red transition disabled:opacity-50"
                    >
                      {uploading ? '...' : '+'}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-gray-500">支持 jpg、png、webp，单张最大 10MB</p>
              </div>

              {/* Warnings */}
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ 重要提示</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>1. 系统只负责预填内容，最终发布需您在小红书页面手动确认</li>
                  <li>2. 请遵守小红书社区规范</li>
                  <li>3. 图片将在 24 小时后自动删除</li>
                </ul>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={creating}
                  className="flex-1 py-2.5 bg-xhs-red text-white rounded-xl font-medium hover:bg-xhs-red-hover transition disabled:opacity-50"
                >
                  {creating ? '创建中...' : '确认创建任务'}
                </button>
              </div>

              {/* Manual fallback */}
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500 mb-2">不想用扩展？也可以手动发布</p>
                <div className="flex gap-2 justify-center">
                  <button onClick={handleCopyContent} className="text-xs text-xhs-red hover:underline">
                    复制文案
                  </button>
                  {uploadedImages.length > 0 && (
                    <button onClick={handleDownloadImages} className="text-xs text-xhs-red hover:underline">
                      下载图片
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
