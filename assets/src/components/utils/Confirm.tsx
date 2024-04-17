import { ReactNode } from 'react'
import { ApolloError } from '@apollo/client'
import { Button, Modal } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { GraphQLError } from 'graphql'
import { GraphQLErrors } from '@apollo/client/errors'

import { GqlError } from './Alert'
import { ModalMountTransition } from './ModalMountTransition'

type ConfirmProps = {
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
}: ConfirmProps) {
  const theme = useTheme()

  return (
    <ModalMountTransition open={open}>
      <Modal
        header={title}
        open={open}
        onClose={close || undefined}
        width="512px"
        portal
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
              error={
                errorMessage
                  ? ({
                      graphQLErrors: [
                        { message: errorMessage } as GraphQLError,
                      ] as GraphQLErrors,
                    } as ApolloError)
                  : error
              }
              header={errorHeader}
            />
          </div>
        )}
        <div css={{ ...theme.partials.text.body1, color: theme.colors.text }}>
          {text}
        </div>
      </Modal>
    </ModalMountTransition>
  )
}
