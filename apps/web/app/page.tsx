export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-xhs-red text-white flex items-center justify-center text-3xl font-bold mx-auto">
          红
        </div>
        <h1 className="text-3xl font-bold text-gray-900">小红书运营助手</h1>
        <p className="text-gray-600 max-w-md mx-auto">
          AI 辅助生成小红书爆款笔记。本地开发环境已初始化，开始构建你的产品吧。
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-xhs-red text-white rounded-xl font-medium hover:bg-xhs-red-hover transition-colors"
          >
            查看 API 文档
          </a>
          <a
            href="/prototype/index.html"
            className="px-6 py-3 bg-white text-xhs-red border border-xhs-red rounded-xl font-medium hover:bg-red-50 transition-colors"
          >
            查看 UI 原型
          </a>
        </div>
      </div>
    </main>
  )
}
