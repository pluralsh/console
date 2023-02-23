import {
  ComponentProps,
  ReactElement,
  createContext,
  useContext,
} from 'react'

export type MdLinkProps = Omit<ComponentProps<'a'>, 'ref'> & { ref?: any }

export type MarkdocContextT = {
  variant: 'console' | 'docs'
  renderLink: (props: MdLinkProps) => ReactElement
  useNormalizeHref: (href?: string) => string
  useNavigate: (location?: string) => void
}

const MarkdocContext = createContext<MarkdocContextT | null>(null)

export function MarkdocContextProvider({
  value,
  ...props
}: { value: MarkdocContextT } & Omit<
  ComponentProps<typeof MarkdocContext.Provider>,
  'value'
>) {
  return (
    <MarkdocContext.Provider
      value={value}
      {...props}
    />
  )
}

export function useMarkdocContext() {
  const context = useContext(MarkdocContext)

  if (!context) {
    throw Error('You must wrap your content in a MarkdocContextProvider to use useMarkdocContext()')
  }

  return context
}
