export type KapaMode = 'search' | 'ai'

type KapaApi = ((command: string, ...args: unknown[]) => void) & {
  open?: (options?: { mode?: KapaMode; query?: string; submit?: boolean }) => void
  q?: unknown[]
}

function getKapa(): KapaApi | undefined {
  return window.Kapa as KapaApi | undefined
}

export function openKapa(mode: KapaMode, query?: string) {
  if (typeof window === 'undefined') {
    return
  }

  const tryOpen = () => {
    const kapa = getKapa()

    if (!kapa) {
      return false
    }

    if (typeof kapa.open === 'function') {
      kapa.open({ mode, ...(query ? { query } : {}) })

      return true
    }

    if (typeof kapa === 'function') {
      kapa('open', { mode, ...(query ? { query } : {}) })

      return true
    }

    return false
  }

  if (tryOpen()) {
    return
  }

  const started = Date.now()
  const id = window.setInterval(() => {
    if (tryOpen() || Date.now() - started > 8000) {
      window.clearInterval(id)
    }
  }, 100)
}
