import {
  ReactElement,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import { ModalMountTransition } from '../utils/ModalMountTransition'

import ShareSecretModal from './ShareSecretModal'

interface ContextProps {
  open: () => void
}

const ShareSecretContext = createContext<ContextProps>({} as ContextProps)

export function ShareSecretProvider({ children }): ReactElement<any> {
  const [open, setOpen] = useState<boolean>(false)
  const doOpen = useCallback(() => setOpen(true), [setOpen])
  const context = useMemo(
    () =>
      ({
        open: doOpen,
      }) as ContextProps,
    [doOpen]
  )

  return (
    <ShareSecretContext.Provider value={context}>
      {children}
      <ModalMountTransition open={open}>
        <ShareSecretModal
          open={open}
          setOpen={setOpen}
        />
      </ModalMountTransition>
    </ShareSecretContext.Provider>
  )
}

export const useShareSecretContext = () => {
  const ctx = useContext(ShareSecretContext)

  if (!ctx) {
    throw Error(
      'useShareSecretContext() must be used within a ShareSecretContext'
    )
  }

  return ctx
}

export const useShareSecretOpen = () => {
  const { open } = useShareSecretContext()

  return open
}
