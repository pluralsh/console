import {
  createContext,
  Dispatch,
  ReactNode,
  useContext,
  useLayoutEffect,
} from 'react'

interface HeaderContext {
  setHeaderContent: Dispatch<ReactNode>
}

const PageHeaderContext = createContext<HeaderContext | undefined>(undefined)

function PageHeaderProvider({
  value,
  children,
}: {
  value: HeaderContext
  children: ReactNode
}) {
  return (
    <PageHeaderContext.Provider value={value}>
      {children}
    </PageHeaderContext.Provider>
  )
}

const usePageHeaderContext = (): HeaderContext => {
  const ctx = useContext(PageHeaderContext)

  if (!ctx) {
    throw new Error(
      'usePageHeaderContext() must be used within PageHeaderContext'
    )
  }

  return ctx
}

const useSetPageHeaderContent = (headerContent?: ReactNode) => {
  const ctx = useContext(PageHeaderContext)

  if (!ctx) {
    console.warn(
      'useSetPageHeaderContent() must be used within a PageHeaderContext'
    )
  }
  const { setHeaderContent } = ctx || {}

  useLayoutEffect(() => {
    setHeaderContent?.(headerContent)

    return () => {
      setHeaderContent?.(null)
    }
  }, [setHeaderContent, headerContent])
}

export type { HeaderContext }

export {
  usePageHeaderContext,
  useSetPageHeaderContent,
  PageHeaderProvider,
  PageHeaderContext,
}
