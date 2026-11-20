export const isDocumentHidden = () =>
  typeof document !== 'undefined' && document.visibilityState === 'hidden'

// Calls back when the tab is shown again after being hidden for at least minHiddenMs.
export function onReturnToTab(callback: () => void, minHiddenMs = 0) {
  if (typeof document === 'undefined') return () => {}

  let hiddenAt: number | null = isDocumentHidden() ? Date.now() : null
  const listener = () => {
    if (isDocumentHidden()) {
      hiddenAt ??= Date.now()
      return
    }
    if (hiddenAt !== null && Date.now() - hiddenAt >= minHiddenMs) callback()
    hiddenAt = null
  }

  document.addEventListener('visibilitychange', listener)
  return () => document.removeEventListener('visibilitychange', listener)
}
