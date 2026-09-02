'use client'

import { useEffect, useState } from 'react'

interface ExtensionState {
  installed: boolean
  version: string | null
  loading: boolean
}

export function useExtensionDetector(): ExtensionState {
  const [state, setState] = useState<ExtensionState>({
    installed: false,
    version: null,
    loading: true,
  })

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    let pongReceived = false

    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === 'XHS_EXTENSION_PONG' ||
        event.data?.type === 'XHS_EXTENSION_LOADED'
      ) {
        pongReceived = true
        setState({
          installed: true,
          version: event.data.version || null,
          loading: false,
        })
      }
    }

    window.addEventListener('message', handleMessage)

    // 发送 ping
    window.postMessage({ type: 'XHS_EXTENSION_PING' }, '*')

    timeoutId = setTimeout(() => {
      if (!pongReceived) {
        setState({ installed: false, version: null, loading: false })
      }
    }, 1000)

    return () => {
      window.removeEventListener('message', handleMessage)
      clearTimeout(timeoutId)
    }
  }, [])

  return state
}
