import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MdLinkProps } from 'markdoc/MarkdocContext'

import { isRelativeUrl, removeTrailingSlashes, stripMdExtension } from './text'

export function renderLink({ href, ...props }: MdLinkProps) {
  return (
    <Link
      to={href ?? ''}
      {...props}
    />
  )
}

export function useNormalizeHref(href?:string) {
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

