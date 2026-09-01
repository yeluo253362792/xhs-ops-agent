import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: '小红书运营助手',
  description: 'AI 辅助生成小红书爆款笔记',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <nav className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-gray-900">
              小红书运营助手
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                生成笔记
              </Link>
              <Link href="/history" className="text-gray-600 hover:text-gray-900">
                历史记录
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
