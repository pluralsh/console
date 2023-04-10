import React, {
  PropsWithChildren,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type BreadcrumbBase = {
  url?: string
  key?: string
}

export type BreadcrumbsContextT = {
  breadcrumbs: Breadcrumb[]
  setBreadcrumbs: (crumbs: Breadcrumb[]) => void
}

export type Breadcrumb = BreadcrumbBase &
  (
    | {
        label: Exclude<ReactNode, string>
        textValue: string
      }
    | {
        label: string
        textValue?: string
      }
  )

export const BreadcrumbsContext =
  React.createContext<BreadcrumbsContextT | null>(null)

export function BreadcrumbsProvider({
  children,
  breadcrumbsTransform,
}: PropsWithChildren<{
  breadcrumbsTransform?: (breadcrumbs: Breadcrumb[]) => Breadcrumb[]
}>) {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([])

  const contextVal = useMemo(
    () => ({
      breadcrumbs:
        typeof breadcrumbsTransform === 'function'
          ? breadcrumbsTransform(breadcrumbs)
          : breadcrumbs,
      setBreadcrumbs,
    }),
    [breadcrumbsTransform, breadcrumbs]
  )

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <BreadcrumbsContext.Provider value={contextVal}>
      {children}
    </BreadcrumbsContext.Provider>
  )
}

export function useBreadcrumbs() {
  const ctx = useContext(BreadcrumbsContext)

  if (!ctx) {
    throw Error('useBreadcrumbs() must be used inside a <BreadcrumbProvider>')
  }

  return ctx
}

export function useSetBreadcrumbs(breadcrumbs?: Breadcrumb[]) {
  const ctx = useContext(BreadcrumbsContext)
  const { setBreadcrumbs } = ctx

  useEffect(() => {
    if (setBreadcrumbs && Array.isArray(breadcrumbs)) {
      setBreadcrumbs(breadcrumbs)
    }
  }, [breadcrumbs, setBreadcrumbs])

  if (!ctx) {
    throw Error(
      'useSetBreadcrumbs() must be used inside a <BreadcrumbProvider>'
    )
  }

  return ctx
}
