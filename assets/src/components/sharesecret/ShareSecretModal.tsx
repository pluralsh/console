import { Modal } from '@pluralsh/design-system'

import { useShareSecretContext } from './ShareSecretContext'

export default function ShareSecretModal() {
  const { open, setOpen } = useShareSecretContext()

  return (
    <Modal
      header="Share secret"
      open={open}
      onClose={() => setOpen(false)}
    >
      ...
    </Modal>
  )
}
