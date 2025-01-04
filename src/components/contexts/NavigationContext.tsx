import { type ComponentProps, createContext, useContext } from 'react'

import { type Link } from '../../stories/NavigationContextStub'

export type NavigationContextValue = {
  Link: typeof Link
  usePathname: () => string
  useNavigate: () => (location?: string) => void
}

const NavigationContext = createContext<NavigationContextValue | null>(null)

export function NavigationContextProvider({
  value,
  ...props
}: { value: NavigationContextValue } & Omit<
  ComponentProps<typeof NavigationContext.Provider>,
  'value'
>) {
  return (
    <NavigationContext.Provider
      value={value}
      {...props}
    />
  )
}

export function useNavigationContext() {
  const context = useContext(NavigationContext)

  if (!context) {
    throw Error(
      'You must wrap your content in a NavigationContextProvider to use useNavigationContext()'
    )
  }

  return context
}
