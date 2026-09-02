import { createContext, use, useCallback, useMemo, useState } from 'react'
import { AccessTokensCreateModal } from './AccessTokensCreateModal'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'

type ContextProps = { openModal: () => void }

const AccessTokenContext = createContext<ContextProps>({
  openModal: () =>
    console.error('openModal must be used within a AccessTokenProvider'),
})

export function AccessTokenProvider({ children }) {
  const [isOpen, setIsOpen] = useState<boolean>(false)

  const openModal = useCallback(() => setIsOpen(true), [setIsOpen])
  const context = useMemo(() => ({ openModal }), [openModal])

  return (
    <AccessTokenContext value={context}>
      {children}
      <ModalMountTransition open={isOpen}>
        <AccessTokensCreateModal
          open={isOpen}
          setOpen={setIsOpen}
        />
      </ModalMountTransition>
    </AccessTokenContext>
  )
}

export const useOpenAccessTokenModal = () => {
  const ctx = use(AccessTokenContext)

  if (!ctx)
    throw Error('useAccessTokenOpen() must be used within a AccessTokenContext')

  return ctx.openModal
}
