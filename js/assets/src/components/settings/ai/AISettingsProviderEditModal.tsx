import {
  Button,
  CloseIcon,
  Flex,
  IconFrame,
  Modal,
} from '@pluralsh/design-system'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { AiProvider } from 'generated/graphql'
import { ComponentProps, FormEvent } from 'react'
import styled from 'styled-components'
import { aiProviderToLabel } from './AISettingsProviders.tsx'
import { AISettingsProviderForm } from './AISettingsProviderForm.tsx'

const FormScrollSC = styled.div(({ theme }) => ({
  maxHeight: 'calc(100vh - 200px)',
  overflowY: 'auto',
  paddingRight: theme.spacing.xxsmall,
}))

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
        scrollable={false}
        css={{
          maxHeight: 'calc(100vh - 64px)',
          overflow: 'hidden',
        }}
        onClose={onClose}
        header={
          <Flex
            align="center"
            justify="space-between"
            width="100%"
          >
            <span>
              {header ??
                `Edit ${aiProviderToLabel[formProps.provider]} provider connection`}
            </span>
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
          <div
            css={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
            }}
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
          </div>
        }
      >
        <FormScrollSC>
          <AISettingsProviderForm
            hideProviderSelect={hideProviderSelect}
            providerOptions={providerOptions}
            forceEnableProviderSelect={forceEnableProviderSelect}
            {...formProps}
          />
        </FormScrollSC>
      </Modal>
    </ModalMountTransition>
  )
}
