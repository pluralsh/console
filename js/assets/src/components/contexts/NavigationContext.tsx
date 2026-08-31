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

function usePathname() {
  const loc = useLocation()

  return loc.pathname
}

export default function ConsoleNavContextProvider({
  children,
}: {
  children: ReactNode
}) {
  return (
    <NavigationContextProvider
      value={{
        Link: Link as any,
        usePathname,
        useNavigate: () => {
          const navigate = useNavigate()

          return (loc) => {
            navigate(loc ?? '')
          }
        },
      }}
    >
      {children}
    </NavigationContextProvider>
  )
}
