import { FormEvent, useCallback, useState } from 'react'
import { Button, FormField, Input } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import ModalAlt from '../../cd/ModalAlt'
import { useCreateObjectStoreMutation } from '../../../generated/graphql'
import { GqlError } from '../../utils/Alert'

export default function ConfigureClusterBackupsModal({
  open,
  onClose,
  refetch,
}: {
  open: boolean
  onClose: () => void
  refetch: Nullable<() => void>
}) {
  const theme = useTheme()

  const [name, setName] = useState<string>('')

  const closeModal = useCallback(() => onClose(), [onClose])
  const onCompleted = useCallback(() => {
    refetch?.()
    closeModal()
  }, [refetch, closeModal])

  const [mutation, { loading, error }] = useCreateObjectStoreMutation({
    variables: { attributes: { name } },
    onCompleted,
  })

  const disabled = !name

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!disabled && !loading) {
        mutation()
      }
    },
    [disabled, loading, mutation]
  )

  return (
    <ModalAlt
      header=""
      size="large"
      open={open}
      portal
      onClose={closeModal}
      asForm
      formProps={{ onSubmit }}
      actions={
        <>
          <Button
            type="submit"
            disabled={disabled}
            loading={loading}
            primary
          >
            Save
          </Button>
          <Button
            type="button"
            secondary
            onClick={closeModal}
          >
            Cancel
          </Button>
        </>
      }
    >
      <p
        css={{
          ...theme.partials.text.overline,
          color: theme.colors['text-xlight'],
        }}
      >
        Configure object store
      </p>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.medium,
          marginBottom: error ? theme.spacing.large : 0,
        }}
      >
        <FormField label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
        </FormField>
      </div>
      {error && (
        <div css={{ marginTop: theme.spacing.large }}>
          <GqlError
            header="Problem saving object store credentials"
            error={error}
          />
        </div>
      )}
    </ModalAlt>
  )
}
