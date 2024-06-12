import { useEffect, useMemo } from 'react'
import { withReact } from 'slate-react'
import { withHistory } from 'slate-history'
import { createEditor } from 'slate'

import { withMentions } from './TypeaheadEditor'

export function useEditor() {
  return useMemo(() => withMentions(withReact(withHistory(createEditor()))), [])
}

// useful helper for debugging things like modals
// will label a component and log when it mounts and unmounts
export function useMountLogging(name?: string) {
  const id = `${name ? `${name}-` : 'component-'}${Math.round(
    Math.random() * 1000
  )}`

  useEffect(() => {
    console.log(id, 'mounted')

    return () => {
      console.log(id, 'unmounted')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
