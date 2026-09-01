'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import HistoryCard from '@/components/HistoryCard'
import ResultPanel from '@/components/ResultPanel'
import { HistoryItem, GenerateResponse } from '@/lib/types'
import { fetchHistory, toggleFavorite, deleteHistory } from '@/lib/api'

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchHistory(keyword || undefined, favoriteOnly)
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [keyword, favoriteOnly])

  const handleToggleFavorite = async (id: string, favorite: boolean) => {
    try {
      await toggleFavorite(id, favorite)
      setItems(items.map(item => item.id === id ? { ...item, is_favorite: favorite } : item))
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return
    try {
      await deleteHistory(id)
      setItems(items.filter(item => item.id !== id))
      if (selectedItem?.id === id) setSelectedItem(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }

  const resultFromItem = (item: HistoryItem): GenerateResponse => ({
    success: true,
    data: item.generated_content,
    compliance: item.compliance_result,
  })

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">历史记录</h1>
            <p className="text-sm text-gray-500 mt-1">查看和管理你生成的笔记</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-xhs-red text-white rounded-xl text-sm font-medium hover:bg-xhs-red-hover transition-colors"
          >
            去生成
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <input
                type="text"
                placeholder="搜索历史记录..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={favoriteOnly}
                  onChange={(e) => setFavoriteOnly(e.target.checked)}
                  className="rounded border-gray-300 text-xhs-red focus:ring-xhs-red"
                />
                仅显示收藏
              </label>
            </div>

            {loading && <div className="text-center py-8 text-gray-500">加载中...</div>}

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-800 text-sm">
                {error}
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
                暂无历史记录
              </div>
            )}

            <div className="space-y-4">
              {items.map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDelete}
                  onClick={setSelectedItem}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            {selectedItem ? (
              <ResultPanel result={resultFromItem(selectedItem)} />
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center min-h-[400px] flex flex-col items-center justify-center text-gray-500">
                <div className="text-4xl mb-4">📄</div>
                <p>点击左侧历史记录查看详情</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
