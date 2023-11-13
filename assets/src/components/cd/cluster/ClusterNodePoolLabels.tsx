import { ChipList, Modal } from '@pluralsh/design-system'

function renderLabel([name, value]: [string, unknown]) {
  return (
    <>
      {name}
      {value && `: ${value}`}
    </>
  )
}

export function LabelsModal({
  open,
  onClose,
  labels,
  poolName,
}: {
  open: boolean
  onClose: () => void
  poolName: string
  labels: [string, unknown][]
}) {
  return (
    <Modal
      portal
      header={`${poolName ? `${poolName} labels` : 'Labels'}`}
      open={open}
      onClose={onClose}
      size="large"
    >
      <ChipList
        size="small"
        limit={8}
        values={labels}
        transformValue={renderLabel}
      />
    </Modal>
  )
}
