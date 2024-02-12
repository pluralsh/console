import ModalAlt from '../../cd/ModalAlt'

export default function CreateObjectStoreModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: Nullable<() => void>
}) {
  return (
    <ModalAlt
      header="Add object store"
      size="large"
      style={{ padding: 0, position: 'absolute' }}
      open={open}
      portal
      onClose={() => {
        onClose?.()
      }}
    />
  )
}
