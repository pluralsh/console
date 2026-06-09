import { Button, Flex, Modal } from '@pluralsh/design-system'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { AiProvider } from 'generated/graphql'
import { ComponentProps, FormEvent } from 'react'
import { aiProviderToLabel } from './AISettingsProviders.tsx'
import { AISettingsProviderForm } from './AISettingsProviderForm.tsx'

export function AISettingsProviderModal({
  open,
  onClose,
  header,
  hideProviderSelect = false,
  providerOptions,
  forceEnableProviderSelect = false,
  onSubmit,
  loading,
  valid,
  saveDisabled,
  ...formProps
}: {
  open: boolean
  onClose: () => void
  header?: string
  hideProviderSelect?: boolean
  providerOptions?: readonly AiProvider[]
  forceEnableProviderSelect?: boolean
  onSubmit: (e: FormEvent) => void
  loading: boolean
  valid: boolean
  saveDisabled: boolean
} & ComponentProps<typeof AISettingsProviderForm>) {
  return (
    <ModalMountTransition open={open}>
      <Modal
        asForm
        formProps={{ onSubmit }}
        open={open}
        size="large"
        onClose={onClose}
        header={
          header ??
          `Edit ${aiProviderToLabel[formProps.provider]} provider connection`
        }
        actions={
          <Flex
            justify="space-between"
            width="100%"
          >
            <Button
              destructive
              type="button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={!valid || saveDisabled}
            >
              Save
            </Button>
          </Flex>
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
