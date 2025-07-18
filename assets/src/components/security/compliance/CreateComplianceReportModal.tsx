import { Button, Modal } from '@pluralsh/design-system'
import { useState } from 'react'
import { useTheme } from 'styled-components'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

export function CreateComplianceReportModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()

  return (
    <Modal
      open={open}
      onClose={onClose}
      asForm
      onSubmit={() => {}}
      header="Create compliance report"
      actions={
        <div
          css={{
            display: 'flex',
            flexDirection: 'row-reverse',
            gap: theme.spacing.small,
          }}
        >
          <Button
            primary
            type="submit"
          >
            Create compliance report
          </Button>
          <Button
            secondary
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
        </div>
      }
    >
      sad
    </Modal>
  )
}

export function CreateComplianceReportButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Create report</Button>
      <ModalMountTransition open={open}>
        <CreateComplianceReportModal
          open={open}
          onClose={() => setOpen(false)}
        />
      </ModalMountTransition>
    </>
  )
}
