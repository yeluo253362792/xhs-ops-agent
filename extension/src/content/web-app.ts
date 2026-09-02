/**
 * 注入到 Web App 页面的内容脚本，用于 Web App 检测扩展是否安装。
 */

const EXTENSION_VERSION = '1.0.0'

function init(): void {
  window.addEventListener('message', (event) => {
    // 只响应来自当前页面（Web App）的消息
    if (event.source !== window) return

    if (event.data?.type === 'XHS_EXTENSION_PING') {
      window.postMessage(
        {
          type: 'XHS_EXTENSION_PONG',
          version: EXTENSION_VERSION,
          installed: true
        },
        '*'
      )
    }
  })

  // 通知页面扩展已加载
  window.postMessage(
    {
      type: 'XHS_EXTENSION_LOADED',
      version: EXTENSION_VERSION
    },
    '*'
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
