import ModalAlt from '../../cd/ModalAlt'

export default function CreateObjectStoreModal({
  open,
  onClose,
  refetch,
}: {
  open: boolean
  onClose: Nullable<() => void>
  refetch: () => void
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
