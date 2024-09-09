import {
  Dispatch,
  ReactElement,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react'

import ShareSecretModal from './ShareSecretModal'

interface ContextProps {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

const ShareSecretContext = createContext<ContextProps>({} as ContextProps)

export function ShareSecretProvider({ children }): ReactElement {
  const [open, setOpen] = useState<boolean>(false)

  const context = useMemo(
    () => ({ open, setOpen }) as ContextProps,
    [open, setOpen]
  )

  return (
    <ShareSecretContext.Provider value={context}>
      {children}
      <ShareSecretModal />
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
