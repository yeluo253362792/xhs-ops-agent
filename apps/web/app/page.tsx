'use client'

import { useEffect, useState } from 'react'
import GenerateForm from '@/components/GenerateForm'
import ResultPanel from '@/components/ResultPanel'
import { generateNote, login } from '@/lib/api'
import { GenerateRequest, GenerateResponse } from '@/lib/types'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    login().then(() => setAuthReady(true)).catch(() => setAuthReady(true))
  }, [])

  const handleGenerate = async (request: GenerateRequest) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await generateNote(request)
      if (!data.success) {
        setError(data.error || '生成失败')
      } else {
        setResult(data)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成失败'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-5">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">小红书运营助手</h1>
                <p className="text-sm text-gray-500 mt-1">AI 辅助生成爆款图文笔记</p>
                {!authReady && (
                  <p className="text-xs text-gray-400 mt-1">正在连接服务...</p>
                )}
              </div>
              <GenerateForm onSubmit={handleGenerate} loading={loading} />
            </div>
          </div>

          <div className="xl:col-span-7">
            {!result && !loading && !error && (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center min-h-[500px] flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4 text-3xl">
                  ✨
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">开始创作你的小红书笔记</h3>
                <p className="text-sm text-gray-500">在左侧输入主题和受众，AI 将为你生成完整图文方案</p>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-2xl shadow-sm p-8 min-h-[500px]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-xhs-red/30 border-t-xhs-red rounded-full animate-spin" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">正在生成...</h3>
                    <p className="text-xs text-gray-500">AI 撰写文案、检测合规、输出视觉方案</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse" />
                  <div className="h-24 bg-gray-100 rounded w-full mt-6 animate-pulse" />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-800">
                <div className="font-medium mb-1">生成失败</div>
                <div className="text-sm whitespace-pre-wrap break-words">{error}</div>
                <div className="text-xs text-red-600 mt-3">
                  提示：请检查后端服务是否启动，以及 .env 中的 LLM API 配置是否正确。
                </div>
              </div>
            )}

            {result && <ResultPanel result={result} />}
          </div>
        </div>
      </div>
    </main>
  )
}
