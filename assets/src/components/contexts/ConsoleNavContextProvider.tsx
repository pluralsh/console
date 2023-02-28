import { Link as ReactRouterLink, useLocation, useNavigate } from 'react-router-dom'
import { type LinkProps, NavigationContextProvider } from '@pluralsh/design-system'

function Link({ href, ...props }: LinkProps) {
  return (
    <ReactRouterLink
      to={href ?? ''}
      {...props}
    />
  )
}

function usePathname() {
  const loc = useLocation()

  return loc.pathname
}

