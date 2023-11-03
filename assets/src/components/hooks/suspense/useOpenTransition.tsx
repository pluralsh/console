import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useTransition,
} from 'react'
import { useDebounce } from '@react-hooks-library/core'

export function useOpenTransition(
  isOpen: boolean,
  setIsOpen: Dispatch<SetStateAction<boolean>>,
  showLoadingDelay: Parameters<typeof useDebounce>[1] = 200
) {
  const [isTransitioning, startTransition] = useTransition()
  const debouncedIsTransitioning = useDebounce(
    isTransitioning,
    showLoadingDelay
  )

  const isOpening: Readonly<boolean> = !isOpen && isTransitioning
  const showLoading = !isOpen && debouncedIsTransitioning
  const disabled = isOpen || isOpening
  const onClick = useCallback(() => {
    if (disabled) {
      return
    }
    startTransition(() => {
      setIsOpen(true)
    })
  }, [disabled, setIsOpen])

  return useMemo(
    () => ({
      isOpening,
      showLoading,
      startTransition,
      buttonProps: {
        loading: showLoading,
        disabled,
        onClick,
      },
    }),
    [disabled, isOpening, onClick, showLoading]
  )
}
