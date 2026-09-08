import { ContextSource } from 'generated/graphql'
import { useLocation } from 'react-router-dom'

export function useCurrentPageChatContext() {
  const { pathname } = useLocation()
  let sourceId: Nullable<string> = null
  let source: Nullable<ContextSource> = null

  // since the chatbot lives outside of the specific router context
  // we have to do this extraction manually (instead of using useParams)
  if (pathname.includes('services')) {
    source = ContextSource.Service
    const match = pathname.match(/services\/([^/]+)/)
    sourceId = match?.[1]
  } else if (pathname.includes('stacks')) {
    source = ContextSource.Stack
    const match = pathname.match(/stacks\/([^/]+)/)
    sourceId = match?.[1]
  }

  return { sourceId, source }
}
