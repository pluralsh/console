import { ComponentProps, createContext, useContext } from 'react'

export type MdLinkProps = Omit<ComponentProps<'a'>, 'ref'> & { ref?: any }

export type MarkdocContextT = {
  variant: 'console' | 'docs'
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
    throw Error(
      'You must wrap your content in a MarkdocContextProvider to use useMarkdocContext()'
    )
  }

  return context
}
