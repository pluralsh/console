import { Modal } from '@pluralsh/design-system'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { ComponentProps } from 'react'
import { aiProviderToLabel } from './AISettingsProviders.tsx'
import { AISettingsProviderForm } from './AISettingsProviderForm.tsx'

export function AISettingsProviderEditModal({
  open,
  onClose,
  ...formProps
}: {
  open: boolean
  onClose: () => void
} & ComponentProps<typeof AISettingsProviderForm>) {
  return (
    <ModalMountTransition open={open}>
      <Modal
        open={open}
        size="large"
        onClose={onClose}
        header={`Edit ${aiProviderToLabel[formProps.provider]} provider connection`}
      >
        <AISettingsProviderForm
          hideProviderSelect
          {...formProps}
        />
      </Modal>
    </ModalMountTransition>
  )
}
