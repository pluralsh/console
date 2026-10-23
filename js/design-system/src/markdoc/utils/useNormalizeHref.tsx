import { useNavigationContext } from '../../components/contexts/NavigationContext'

import { normalizeMarkdownHref, removeTrailingSlashes } from './text'

export function useNormalizeHref(href?: string) {
  const { usePathname, relativeLinkBase } = useNavigationContext()
  const pathname = removeTrailingSlashes(usePathname()) || '/'
  const basePath = relativeLinkBase?.(pathname) ?? pathname

  return normalizeMarkdownHref(href, basePath)
}
