import { useNavigationContext } from '../../index'

import { isRelativeUrl, removeTrailingSlashes, stripMdExtension } from './text'

export function useNormalizeHref(href?: string) {
  const pathname = useNavigationContext().usePathname()
  let finalHref = stripMdExtension(href)

  if (isRelativeUrl(finalHref)) {
    finalHref = `${removeTrailingSlashes(pathname)}/${href}`
  }

  return finalHref
}
