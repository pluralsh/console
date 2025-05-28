import { ApolloError } from '@apollo/client'
import { Button, FormField, Input, Modal } from '@pluralsh/design-system'
import { ReactNode, useState } from 'react'
import { useTheme } from 'styled-components'

import { GqlError } from './Alert'

export type ConfirmProps = {
  open: boolean
  close: Nullable<(...args: any[]) => unknown>
  title?: ReactNode
  error?: ApolloError | undefined
  errorHeader?: string
  errorMessage?: string
  text?: ReactNode
  submit: (...args: any[]) => unknown
  label?: ReactNode
  loading?: boolean
  destructive?: boolean
  extraContent?: ReactNode
  confirmationEnabled?: boolean
  confirmationText?: Nullable<string>
}

export function Confirm({
  open,
  close,
  title = 'Are you sure?',
  error,
  errorHeader = 'Something went wrong',
  errorMessage,
  text,
  submit,
  label,
  loading = false,
  destructive = false,
  extraContent,
  confirmationEnabled = false,
  confirmationText = 'delete',
}: ConfirmProps) {
  const [confirmationInput, setConfirmationInput] = useState('')
  const isConfirmationValid =
    !confirmationEnabled || confirmationInput === confirmationText
  const theme = useTheme()

  return (
    <Modal
      header={title}
      open={open}
      onClose={close || undefined}
      actions={
        <>
          <Button
            type="button"
            secondary
            onClick={close}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            destructive={destructive}
            onClick={submit}
            loading={loading}
            disabled={!isConfirmationValid}
            marginLeft="medium"
          >
            {label || 'Confirm'}
          </Button>
        </>
      }
    >
      {error && (
        <div
          css={{
            marginBottom: theme.spacing.large,
          }}
        >
          <GqlError
            error={errorMessage || error}
            header={errorHeader}
          />
        </div>
      )}
      <div css={{ ...theme.partials.text.body1, color: theme.colors.text }}>
        {text}
      </div>
      {extraContent}
      {confirmationEnabled && (
        <div css={{ marginTop: theme.spacing.medium }}>
          <FormField
            label={<span>Type &quot;{confirmationText}&quot; to confirm</span>}
            css={{
              ' label': {
                width: '100%',
              },
              ':focus-within': {
                borderColor: theme.colors['text-danger-light'],
              },
            }}
          >
            <Input
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={confirmationText}
              css={{
                color: theme.colors.text,
                borderColor: theme.colors['text-danger-light'],
                '::placeholder': {
                  color: theme.colors['text-danger-light'],
                },
              }}
            />
          </FormField>
        </div>
      )}
    </Modal>
  )
}
