import { Link as ReactRouterLink, useLocation } from 'react-router-dom'
import { type LinkProps } from '@pluralsh/design-system'

export function Link({ href, ...props }: LinkProps) {
  return (
    <ReactRouterLink
      to={href ?? ''}
      {...props}
    />
  )
}

export { useNavigate } from 'react-router-dom'

export function usePathname() {
  const loc = useLocation()

  return loc.pathname
}
