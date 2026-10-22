import { useNavigationContext } from '../../components/contexts/NavigationContext'

import { normalizeMarkdownHref, removeTrailingSlashes } from './text'

export function useNormalizeHref(href?: string) {
  const { pathname: currentPathname, relativeLinkBase } = useNavigationContext()
  const pathname = removeTrailingSlashes(currentPathname) || '/'
  const basePath = relativeLinkBase?.(pathname) ?? pathname

  return normalizeMarkdownHref(href, basePath)
}
