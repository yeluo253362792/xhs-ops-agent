'use client'

import { GenerateRequest } from '@/lib/types'

interface Props {
  onSubmit: (data: GenerateRequest) => void
  loading: boolean
}

const CONTENT_TYPES = [
  { value: '干货收藏型', label: '干货收藏型', desc: '教程/清单' },
  { value: '种草带货型', label: '种草带货型', desc: '产品推荐' },
  { value: '情绪共鸣型', label: '情绪共鸣型', desc: '故事感悟' },
  { value: '争议讨论型', label: '争议讨论型', desc: '观点对比' },
  { value: '涨粉型', label: '涨粉型', desc: '人设价值' },
]

export default function GenerateForm({ onSubmit, loading }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit({
      topic: formData.get('topic') as string,
      audience: formData.get('audience') as string,
      content_type: formData.get('content_type') as string,
      tone: formData.get('tone') as string,
      extra_info: formData.get('extra_info') as string,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          主题 / 关键词 <span className="text-red-500">*</span>
        </label>
        <input
          name="topic"
          type="text"
          required
          defaultValue="油皮夏季护肤"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
          placeholder="例如：油皮夏季护肤"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          目标受众 <span className="text-red-500">*</span>
        </label>
        <input
          name="audience"
          type="text"
          required
          defaultValue="20-30岁油皮女生"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
          placeholder="例如：学生党、职场新人"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          笔记类型 <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CONTENT_TYPES.map((type) => (
            <label
              key={type.value}
              className="cursor-pointer border-2 border-gray-100 rounded-xl p-3 hover:border-red-200 has-[:checked]:border-red-500 has-[:checked]:bg-red-50"
            >
              <input
                type="radio"
                name="content_type"
                value={type.value}
                defaultChecked={type.value === '干货收藏型'}
                className="sr-only"
              />
              <div className="font-medium text-sm">{type.label}</div>
              <div className="text-xs text-gray-500">{type.desc}</div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">语气风格</label>
        <select
          name="tone"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
        >
          <option value="亲切自然">亲切自然</option>
          <option value="专业靠谱">专业靠谱</option>
          <option value="轻松幽默">轻松幽默</option>
          <option value="犀利直接">犀利直接</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">补充信息</label>
        <textarea
          name="extra_info"
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none"
          placeholder="产品名称、个人经历、特殊要求等"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl font-medium text-white bg-xhs-red hover:bg-xhs-red-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            生成中...
          </>
        ) : (
          <>
            <span>✨</span>
            生成笔记
          </>
        )}
      </button>
    </form>
  )
}
