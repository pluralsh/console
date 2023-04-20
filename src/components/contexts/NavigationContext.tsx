import {
  type ComponentProps,
  type ComponentType,
  type RefAttributes,
  createContext,
  useContext,
} from 'react'

export type NavigationContextLinkProps = Omit<ComponentProps<'a'>, 'ref'> & {
  ref?: any
}

export type NavigationContextValue = {
  Link: ComponentType<NavigationContextLinkProps & RefAttributes<any>>
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
