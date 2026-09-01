'use client'

import { HistoryItem } from '@/lib/types'

interface Props {
  item: HistoryItem
  onToggleFavorite: (id: string, favorite: boolean) => void
  onDelete: (id: string) => void
  onClick: (item: HistoryItem) => void
}

export default function HistoryCard({ item, onToggleFavorite, onDelete, onClick }: Props) {
  const content = item.generated_content

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 cursor-pointer" onClick={() => onClick(item)}>
          <h3 className="font-bold text-gray-900">{content.titles?.[0] || item.topic}</h3>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(item.created_at).toLocaleString()} · {item.content_type}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleFavorite(item.id, !item.is_favorite)}
            className={`text-xl ${item.is_favorite ? 'text-xhs-red' : 'text-gray-300'} hover:text-xhs-red transition-colors`}
          >
            {item.is_favorite ? '★' : '☆'}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            🗑
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {content.tags?.slice(0, 4).map((tag, index) => (
          <span key={index} className="px-2 py-0.5 rounded text-xs bg-red-50 text-xhs-red">
            {tag}
          </span>
        ))}
      </div>

      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{content.body}</p>

      {item.compliance_result && (
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            item.compliance_result.level === 'low'
              ? 'bg-green-100 text-green-700'
              : item.compliance_result.level === 'medium'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {item.compliance_result.level === 'low'
            ? '低风险'
            : item.compliance_result.level === 'medium'
            ? '中风险'
            : '高风险'}
        </span>
      )}
    </div>
  )
}
