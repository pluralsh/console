import { NavigationContextProvider } from '@pluralsh/design-system'
import React, { ReactNode } from 'react'
import {
  Link as ReactRouterLink,
  useLocation,
  useNavigate,
} from 'react-router-dom'

function Link({
  href,
  ...props
}: { href?: string } & Omit<
  React.ComponentPropsWithRef<typeof ReactRouterLink>,
  'to'
>) {
  return (
    <ReactRouterLink
      to={href ?? ''}
      {...props}
    />
  )
}

export default function ConsoleNavContextProvider({
  children,
}: {
  children: ReactNode
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <NavigationContextProvider
      value={{
        Link: Link as any,
        pathname,
        navigate: (loc) => {
          navigate(loc ?? '')
        },
      }}
    >
      {children}
    </NavigationContextProvider>
  )
}
