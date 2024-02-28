import { Modal } from '@pluralsh/design-system'

import PersonaMembers from './PersonaMembers'

export default function PersonaView({ persona, open, onClose }: any) {
  return (
    <Modal
      header="View persona"
      open={open}
      onClose={onClose}
      portal
    >
      <PersonaMembers persona={persona} />
    </Modal>
  )
}
