import { Modal } from '@pluralsh/design-system'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { AiProvider } from 'generated/graphql'
import { ComponentProps } from 'react'
import { aiProviderToLabel } from './AISettingsProviders.tsx'
import { AISettingsProviderForm } from './AISettingsProviderForm.tsx'

export function AISettingsProviderModal({
  open,
  onClose,
  header,
  hideProviderSelect = false,
  providerOptions,
  forceEnableProviderSelect = false,
  ...formProps
}: {
  open: boolean
  onClose: () => void
  header?: string
  hideProviderSelect?: boolean
  providerOptions?: readonly AiProvider[]
  forceEnableProviderSelect?: boolean
} & ComponentProps<typeof AISettingsProviderForm>) {
  return (
    <ModalMountTransition open={open}>
      <Modal
        open={open}
        size="large"
        onClose={onClose}
        header={
          header ??
          `Edit ${aiProviderToLabel[formProps.provider]} provider connection`
        }
      >
        <AISettingsProviderForm
          hideProviderSelect={hideProviderSelect}
          providerOptions={providerOptions}
          forceEnableProviderSelect={forceEnableProviderSelect}
          {...formProps}
        />
      </Modal>
    </ModalMountTransition>
  )
}

export const AISettingsProviderEditModal = AISettingsProviderModal
