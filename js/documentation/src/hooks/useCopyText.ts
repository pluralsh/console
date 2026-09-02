import { useCallback, useEffect, useState } from 'react'

/**
 * Hook for copy-to-clipboard with visual feedback.
 * Returns { copied, handleCopy }. copied resets to false after 1s.
 */
export function useCopyText(text: string) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    try {
      await window.navigator.clipboard.writeText(text)
      setCopied(true)

      return true
    } catch (error) {
      console.error('Failed to copy text to clipboard:', error)
      setCopied(false)

      return false
    }
  }, [text])

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 1000)

      return () => clearTimeout(timeout)
    }
  }, [copied])

  return { copied, handleCopy }
}
