import {
  ComponentProps,
  ReactElement,
  createContext,
  useContext,
} from 'react'

export type LinkProps = Omit<ComponentProps<'a'>, 'ref'> & { ref?: any }

export type NavigationContextT = {
  Link: (props: LinkProps) => ReactElement
  usePathname: (href?: string) => string
  useNavigate: ()=> (location?: string) => void
}

const NavigationContext = createContext<NavigationContextT | null>(null)

export function NavigationContextProvider({
  value,
  ...props
}: { value: NavigationContextT } & Omit<
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
    throw Error('You must wrap your content in a NavigationContextProvider to use useNavigationContext()')
  }

  return context
}
