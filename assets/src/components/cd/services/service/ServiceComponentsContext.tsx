import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useLayoutEffect,
} from 'react'

export type ServiceComponentsContextType = {
  setFiltersHidden: Dispatch<SetStateAction<boolean>>
  setViewSwitchContent: Dispatch<SetStateAction<ReactNode>>
}

export const ServiceComponentsContext =
  createContext<ServiceComponentsContextType | null>(null)

export const useServiceComponentsContext = (): ServiceComponentsContextType => {
  const ctx = useContext(ServiceComponentsContext)

  if (!ctx) {
    throw new Error(
      'useServiceComponentsContext() must be used within ServiceComponentsContext'
    )
  }

  return ctx
}

export const useSetServiceComponentsViewSwitchContent = (
  viewSwitchContent?: ReactNode
) => {
  const ctx = useContext(ServiceComponentsContext)

  if (!ctx) {
    console.warn(
      'useSetServiceComponentsViewSwitchContent() must be used within ServiceComponentsContext'
    )
  }

  const { setViewSwitchContent } = ctx || {}

  useLayoutEffect(() => {
    setViewSwitchContent?.(viewSwitchContent ?? null)

    return () => {
      setViewSwitchContent?.(null)
    }
  }, [setViewSwitchContent, viewSwitchContent])
}

export const useSetServiceComponentsFiltersHidden = (
  filtersHidden: boolean
) => {
  const ctx = useContext(ServiceComponentsContext)

  if (!ctx) {
    console.warn(
      'useSetServiceComponentsFiltersHidden() must be used within ServiceComponentsContext'
    )
  }

  const { setFiltersHidden } = ctx || {}

  useLayoutEffect(() => {
    setFiltersHidden?.(filtersHidden)

    return () => {
      setFiltersHidden?.(false)
    }
  }, [setFiltersHidden, filtersHidden])
}
