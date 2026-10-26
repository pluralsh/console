import {
  type ComponentProps,
  type ComponentType,
  createContext,
  useContext,
} from 'react'

export type NavigationContextValue = {
  Link: ComponentType<ComponentProps<'a'>>
  pathname: string
  navigate: (location?: string) => void
  /**
   * Directory a relative Markdown link should resolve against.
   * Leaf pages should pass their parent route; index pages should pass themselves.
   * When omitted, relative links resolve against the current pathname.
   */
  relativeLinkBase?: (pathname: string) => string
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
