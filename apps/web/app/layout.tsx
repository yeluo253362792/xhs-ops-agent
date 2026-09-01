import type { Metadata } from 'next'
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
      <body>{children}</body>
    </html>
  )
}
