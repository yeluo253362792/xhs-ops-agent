'use client'

import { useState } from 'react'
import { GenerateResponse } from '@/lib/types'
import ComplianceBadge from './ComplianceBadge'
import PublishDrawer from './PublishDrawer'

interface Props {
  result: GenerateResponse
}

const TABS = [
  { id: 'titles', label: '标题' },
  { id: 'body', label: '正文' },
  { id: 'tags', label: '标签' },
  { id: 'cover', label: '封面' },
  { id: 'images', label: '图片脚本' },
  { id: 'compliance', label: '合规' },
  { id: 'publish', label: '发布建议' },
]

function copyText(text: string) {
  navigator.clipboard.writeText(text)
}

export default function ResultPanel({ result }: Props) {
  const [activeTab, setActiveTab] = useState('titles')
  const [selectedTitle, setSelectedTitle] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (!result.success || !result.data) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-800">
        <div className="font-medium mb-1">生成失败</div>
        <div className="text-sm">{result.error || '未知错误'}</div>
      </div>
    )
  }

  const data = result.data
  const compliance = result.compliance!

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-900">生成结果</h2>
            <p className="text-xs text-gray-500 mt-1">已生成图文笔记方案</p>
          </div>
          <ComplianceBadge compliance={compliance} />
        </div>
        <div className="flex gap-4 border-b border-gray-100 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 text-sm font-medium whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-xhs-red border-b-2 border-xhs-red'
                  : 'text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 min-h-[300px]">
        {activeTab === 'titles' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 mb-3">选择最适合的标题</p>
            {data.titles.map((title, index) => (
              <div
                key={index}
                onClick={() => setSelectedTitle(index)}
                className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                  selectedTitle === index
                    ? 'border-xhs-red bg-red-50'
                    : 'border-gray-100 hover:border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-xs font-bold text-xhs-red flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        copyText(title)
                      }}
                      className="text-xs text-xhs-red mt-2"
                    >
                      复制
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'body' && (
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">正文</span>
              <button onClick={() => copyText(data.body)} className="text-xs bg-gray-100 px-2 py-1 rounded">
                复制
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {data.body}
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">标签</span>
              <button onClick={() => copyText(data.tags.join(' '))} className="text-xs bg-gray-100 px-2 py-1 rounded">
                复制全部
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag, index) => (
                <span key={index} className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-50 text-xhs-red">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cover' && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">封面文案</h4>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-lg font-bold text-gray-900 mb-4">
              {data.cover_text}
            </div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">设计建议</h4>
            <div className="space-y-2 text-sm text-gray-700">
              {data.cover_design.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-xhs-red mt-2 flex-shrink-0" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">图片脚本</span>
              <span className="text-xs text-gray-500">共 {data.image_script.length} 张</span>
            </div>
            <div className="space-y-3">
              {data.image_script.map((img, index) => (
                <div key={index} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-xs font-bold text-xhs-red">
                      {index + 1}
                    </span>
                    <span className="font-medium text-sm">{img.content}</span>
                  </div>
                  <p className="text-xs text-gray-600"><span className="font-medium">拍摄：</span>{img.desc}</p>
                  <p className="text-xs text-xhs-red"><span className="font-medium">配文：</span>{img.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">合规检测</h4>
            <div
              className={`p-4 rounded-xl mb-4 ${
                compliance.level === 'low'
                  ? 'bg-green-50 text-green-800'
                  : compliance.level === 'medium'
                  ? 'bg-yellow-50 text-yellow-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              <div className="font-medium mb-1">
                风险等级：{compliance.level === 'low' ? '低风险' : compliance.level === 'medium' ? '中风险' : '高风险'}
              </div>
              <div className="text-sm">{compliance.issues.join('；')}</div>
            </div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">修改建议</h4>
            <div className="space-y-2 text-sm text-gray-700">
              {compliance.suggestions.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-xhs-red mt-2 flex-shrink-0" />
                  <p>{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'publish' && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">发布与运营建议</h4>
            <div className="space-y-2 text-sm text-gray-700">
              {data.publish_suggestions.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-xhs-red mt-2 flex-shrink-0" />
                  <p>{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="border-t border-gray-100 p-4 flex gap-3">
        <button
          onClick={() => {
            const text = `标题：${data.titles[selectedTitle] || data.topic}\n\n${data.body}\n\n${data.tags.map(t => '#' + t).join(' ')}`
            copyText(text)
          }}
          className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition"
        >
          复制全部
        </button>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 py-2.5 bg-xhs-red text-white rounded-xl font-medium hover:bg-xhs-red-hover transition flex items-center justify-center gap-2"
        >
          <span>✨</span>
          发布到小红书
        </button>
      </div>

      <PublishDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        result={result}
      />
    </div>
  )
}
