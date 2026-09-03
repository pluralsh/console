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
  setShowChatButton: Dispatch<SetStateAction<boolean>>
  setHeadingContent: Dispatch<SetStateAction<ReactNode | null>>
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

export const useSetServiceComponentsHeadingContent = (
  headingContent?: ReactNode
) => {
  const ctx = useContext(ServiceComponentsContext)

  if (!ctx) {
    console.warn(
      'useSetServiceComponentsHeadingContent() must be used within ServiceComponentsContext'
    )
  }

  const { setHeadingContent } = ctx || {}

  useLayoutEffect(() => {
    setHeadingContent?.(headingContent ?? null)

    return () => {
      setHeadingContent?.(null)
    }
  }, [setHeadingContent, headingContent])
}

export const useSetServiceComponentsChatButtonVisible = (
  showChatButton: boolean
) => {
  const ctx = useContext(ServiceComponentsContext)

  if (!ctx) {
    console.warn(
      'useSetServiceComponentsChatButtonVisible() must be used within ServiceComponentsContext'
    )
  }

  const { setShowChatButton } = ctx || {}

  useLayoutEffect(() => {
    setShowChatButton?.(showChatButton)

    return () => {
      setShowChatButton?.(false)
    }
  }, [setShowChatButton, showChatButton])
}
