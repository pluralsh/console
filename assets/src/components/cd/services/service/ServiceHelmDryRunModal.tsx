import { Button, Modal } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

export function ServiceHelmDryRunModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()

  return (
    <Modal
      portal
      header="Dry run output"
      open={open}
      onClose={onClose}
      size="large"
      actions={
        <div css={{ display: 'flex', gap: theme.spacing.medium }}>
          <Button
            type="button"
            secondary
            onClick={(e) => {
              e.preventDefault()
              onClose()
            }}
          >
            Close
          </Button>
          <Button
            type="submit"
            // disabled={disabled}
            // loading={loading}
            primary
          >
            Save
          </Button>
        </div>
      }
    >
      output
    </Modal>
  )
}
