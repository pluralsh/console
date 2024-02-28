import { Modal } from '@pluralsh/design-system'

export default function PersonaView({ open, onClose }: any) {
  return (
    <Modal
      header="View persona"
      open={open}
      onClose={onClose}
      portal
    >
      TODO: Add PersonaView content
    </Modal>
  )
}
