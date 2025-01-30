import {
  Button,
  Flex,
  FormField,
  GrafanaLogoIcon,
  Input2,
  ListBoxItem,
  Modal,
  Select,
  WebhooksIcon,
} from '@pluralsh/design-system'
import { ComponentPropsWithoutRef, useCallback } from 'react'
import styled from 'styled-components'

import {
  ObservabilityWebhookFragment,
  ObservabilityWebhookType,
  useUpsertObservabilityWebhookMutation,
} from 'generated/graphql'

import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { useUpdateState } from 'components/hooks/useUpdateState'
import { GqlError } from 'components/utils/Alert'
import { capitalize } from 'lodash'

export function EditObservabilityWebhookModal({
  open,
  onClose,
  ...props
}: {
  open: boolean
  onClose: () => void
} & ComponentPropsWithoutRef<typeof EditObservabilityWebhook>) {
  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <EditObservabilityWebhook
        onClose={onClose}
        {...props}
      />
    </Modal>
  )
}

export function EditObservabilityWebhook({
  observabilityWebhook,
  operationType,
  refetch,
  onClose,
}: {
  observabilityWebhook?: ObservabilityWebhookFragment
  operationType: 'create' | 'update'
  refetch?: () => void
  onClose: () => void
}) {
  const {
    state: formState,
    update: updateFormState,
    hasUpdates,
  } = useUpdateState({
    type: observabilityWebhook?.type || ObservabilityWebhookType.Grafana,
    name: observabilityWebhook?.name || '',
    secret: '',
  })

  const { name, type, secret } = formState

  const allowSubmit = name && type && secret && hasUpdates

  const [mutation, { loading, error }] = useUpsertObservabilityWebhookMutation({
    variables: { attributes: { name, type, secret } },
    onCompleted: () => {
      refetch?.()
      onClose()
    },
  })

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()
      if (allowSubmit) mutation()
    },
    [allowSubmit, mutation]
  )

  return (
    <WrapperFormSC onSubmit={onSubmit}>
      {error && <GqlError error={error} />}
      <FormField
        label="Provider type"
        required
      >
        <Select
          selectedKey={type}
          leftContent={getObservabilityWebhookTypeIcon(type)}
          label="Select provider type"
          onSelectionChange={(key) =>
            updateFormState({ type: key as ObservabilityWebhookType })
          }
        >
          {Object.values(ObservabilityWebhookType).map((type) => (
            <ListBoxItem
              key={type}
              leftContent={getObservabilityWebhookTypeIcon(type)}
              label={capitalize(type)}
            />
          ))}
        </Select>
      </FormField>
      <FormField
        label="Name"
        required
      >
        <Input2
          value={formState.name}
          onChange={(e) => updateFormState({ name: e.target.value })}
          disabled={operationType === 'update'}
        />
      </FormField>
      <FormField
        label="Secret"
        required
      >
        <InputRevealer
          defaultRevealed={false}
          value={formState.secret}
          onChange={(e) => updateFormState({ secret: e.target.value })}
        />
      </FormField>
      <Flex
        gap="small"
        justify="flex-end"
      >
        <Button
          secondary
          onClick={() => onClose?.()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={loading}
          disabled={!allowSubmit}
        >
          {operationType === 'create' ? 'Create' : 'Update'}
        </Button>
      </Flex>
    </WrapperFormSC>
  )
}

const WrapperFormSC = styled.form(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))

function getObservabilityWebhookTypeIcon(type: ObservabilityWebhookType) {
  switch (type) {
    case ObservabilityWebhookType.Grafana:
      return <GrafanaLogoIcon fullColor />
    default:
      return <WebhooksIcon />
  }
}
