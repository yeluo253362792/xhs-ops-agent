// Vitest setup file
import { vi } from 'vitest'

// Mock chrome API
global.chrome = {
  storage: {
    local: {
      get: vi.fn() as unknown as <T = Record<string, unknown>>(keys?: string | string[] | Record<string, T>) => Promise<Record<string, T>>,
      set: vi.fn() as unknown as (items: Record<string, unknown>) => Promise<void>,
      remove: vi.fn() as unknown as (keys: string | string[]) => Promise<void>,
      clear: vi.fn() as unknown as () => Promise<void>,
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn()
      }
    }
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn()
    },
    onStartup: {
      addListener: vi.fn()
    },
    onInstalled: {
      addListener: vi.fn()
    }
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
    onClicked: {
      addListener: vi.fn()
    }
  },
  notifications: {
    create: vi.fn(),
    onButtonClicked: {
      addListener: vi.fn()
    },
    onClicked: {
      addListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    update: vi.fn(),
    create: vi.fn()
  },
  windows: {
    update: vi.fn()
  },
  cookies: {
    get: vi.fn()
  }
} as unknown as typeof chrome
