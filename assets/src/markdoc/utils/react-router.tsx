import { useLocation, useNavigate } from 'react-router-dom'

import { isRelativeUrl, removeTrailingSlashes, stripMdExtension } from './text'

export function useHref(href?:string) {
  const { pathname } = useLocation()
  let finalHref = stripMdExtension(href)

  if (isRelativeUrl(finalHref)) {
    finalHref = `${removeTrailingSlashes(pathname)}/${href}`
  }

  return finalHref
}

export {
  useNavigate,
}
