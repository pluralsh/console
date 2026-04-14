import {
  Button,
  CloseIcon,
  Flex,
  IconFrame,
  Modal,
} from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'

const ModalActionsRowSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
  gap: theme.spacing.medium,
}))

export function WorkbenchToolsEditModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const theme = useTheme()

  return (
    <Modal
      open={open}
      onClose={onClose}
      header={
        <Flex
          align="center"
          justify="space-between"
          width="100%"
        >
          <span>Add or remove tool from workbench</span>
          <IconFrame
            clickable
            size="small"
            icon={<CloseIcon size={12} />}
            tooltip="Close"
            onClick={onClose}
          />
        </Flex>
      }
      actions={
        <ModalActionsRowSC>
          <Button
            destructive
            type="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            primary
            type="button"
            onClick={() => {}}
          >
            Save
          </Button>
        </ModalActionsRowSC>
      }
    >
      <Flex
        align="center"
        justify="center"
        css={{
          color: theme.colors['text-xlight'],
          paddingTop: theme.spacing.large,
          paddingBottom: theme.spacing.large,
        }}
      >
        ...
      </Flex>
    </Modal>
  )
}
