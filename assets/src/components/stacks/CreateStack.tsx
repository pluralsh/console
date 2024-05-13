import { Button, Modal, Tooltip, ValidatedInput } from '@pluralsh/design-system'
import { ButtonProps } from 'honorable'
import { ReactNode, useCallback, useState } from 'react'
import isEmpty from 'lodash/isEmpty'

import { useTheme } from 'styled-components'

import { GqlError } from '../utils/Alert'
import {
  StackType,
  StacksDocument,
  useCreateStackMutation,
} from '../../generated/graphql'
import { appendConnection, updateCache } from '../../utils/graphql'

export default function CreateStack({
  buttonContent = 'Create stack',
  buttonProps,
}: {
  buttonProps?: ButtonProps
  buttonContent?: string | ReactNode
}) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  const close = useCallback(() => {
    setName('')
    setOpen(false)
  }, [])

  const [mutation, { loading, error }] = useCreateStackMutation({
    variables: {
      // TODO: Add these and others to form.
      attributes: {
        name,
        clusterId: '',
        repositoryId: '',
        type: StackType.Terraform,
        git: { ref: '', folder: '' },
        configuration: { version: '' },
      },
    },
    onCompleted: () => close(),
    update: (cache, { data }) =>
      updateCache(cache, {
        query: StacksDocument,
        update: (prev) =>
          appendConnection(prev, data?.createStack, 'infrastructureStacks'),
      }),
  })

  return (
    <>
      <Tooltip label="Create stack">
        <Button
          {...buttonProps}
          onClick={() => setOpen(true)}
        >
          {buttonContent}
        </Button>
      </Tooltip>
      <Modal
        header="Create infrastracture stack"
        open={open}
        onClose={() => close()}
        actions={
          <>
            <Button
              secondary
              onClick={() => close()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isEmpty(name)}
              onClick={() => mutation()}
              loading={loading}
              marginLeft="medium"
            >
              Create
            </Button>
          </>
        }
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.medium,
          }}
        >
          <ValidatedInput
            value={name}
            onChange={({ target: { value } }) => setName(value)}
            label="Name"
          />
          {error && (
            <GqlError
              header="Something went wrong"
              error={error}
            />
          )}
        </div>
      </Modal>
    </>
  )
}
