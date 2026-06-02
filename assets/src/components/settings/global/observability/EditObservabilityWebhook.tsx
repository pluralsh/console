import {
  AlertopsLogoIcon,
  Button,
  DatadogLogoIcon,
  Flex,
  FormField,
  GrafanaLogoIcon,
  Input2,
  ListBoxItem,
  Modal,
  NewrelicLogoIcon,
  PagerdutyLogoIcon,
  PluralLogoIcon,
  Select,
  SentryLogoIcon,
  Stepper,
  WebhooksIcon,
} from '@pluralsh/design-system'
import {
  ComponentPropsWithoutRef,
  useCallback,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import styled from 'styled-components'

import {
  ObservabilityWebhookFragment,
  ObservabilityWebhookType,
  PolicyBindingFragment,
  useUpsertObservabilityWebhookMutation,
} from 'generated/graphql'

import { SecretInputWithGenerate } from 'components/utils/SecretInputWithGenerate'
import { useUpdateState } from 'components/hooks/useUpdateState'
import { bindingToBindingAttributes } from 'components/utils/bindings'
import { GqlError } from 'components/utils/Alert'
import { WebhookAccessPolicyStep } from 'components/workbenches/workbench/webhooks/WebhookAccessPolicyStep'
import {
  WEBHOOK_ACCESS_FORM_STEPS,
  WebhookAccessFormStep,
} from 'components/workbenches/workbench/webhooks/webhookFormSteps'
import { humanizeObservabilityWebhookType } from 'utils/webhookLabels'
import { isNonNullable } from 'utils/isNonNullable'

type ObservabilityWebhookFormState = {
  type: ObservabilityWebhookType
  name: string
  secret: string
  readBindings: PolicyBindingFragment[]
  writeBindings: PolicyBindingFragment[]
}

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
      {open ? (
        <EditObservabilityWebhook
          key={`${props.operationType}-${props.observabilityWebhook?.id ?? 'new'}`}
          onClose={onClose}
          {...props}
        />
      ) : null}
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
  const initialFormState = useMemo(
    (): ObservabilityWebhookFormState => ({
      type: observabilityWebhook?.type ?? ObservabilityWebhookType.Grafana,
      name: observabilityWebhook?.name ?? '',
      secret: '',
      readBindings:
        observabilityWebhook?.readBindings?.filter(isNonNullable) ?? [],
      writeBindings:
        observabilityWebhook?.writeBindings?.filter(isNonNullable) ?? [],
    }),
    [
      observabilityWebhook?.type,
      observabilityWebhook?.name,
      observabilityWebhook?.readBindings,
      observabilityWebhook?.writeBindings,
    ]
  )

  const {
    state: formState,
    update: updateFormState,
    hasUpdates,
  } = useUpdateState<ObservabilityWebhookFormState>(initialFormState)

  const [currentStep, setCurrentStep] = useState<WebhookAccessFormStep>('setup')

  const stepIndex = WEBHOOK_ACCESS_FORM_STEPS.findIndex(
    (s) => s.key === currentStep
  )

  const { type, name, secret, readBindings, writeBindings } = formState

  const allowSubmitSetup =
    !!name?.trim() && !!type && !!secret?.trim() && hasUpdates

  const allowSavePolicy =
    operationType === 'update' &&
    !!name?.trim() &&
    !!type &&
    !!secret?.trim() &&
    hasUpdates

  const [upsertWebhook, { loading, error }] =
    useUpsertObservabilityWebhookMutation()

  const runUpsert = useCallback(async () => {
    await upsertWebhook({
      variables: {
        attributes: {
          name: name.trim(),
          type,
          secret: secret.trim(),
          readBindings: readBindings
            .filter(isNonNullable)
            .map(bindingToBindingAttributes),
          writeBindings: writeBindings
            .filter(isNonNullable)
            .map(bindingToBindingAttributes),
        },
      },
      onCompleted: () => {
        refetch?.()
        onClose()
      },
    })
  }, [
    upsertWebhook,
    name,
    type,
    secret,
    readBindings,
    writeBindings,
    refetch,
    onClose,
  ])

  const onSubmitSetup = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!allowSubmitSetup) return
      await runUpsert()
    },
    [allowSubmitSetup, runUpsert]
  )

  const onSavePolicy = useCallback(async () => {
    if (!allowSavePolicy) return
    await runUpsert()
  }, [allowSavePolicy, runUpsert])

  return (
    <WrapperSC onSubmit={onSubmitSetup}>
      {error && <GqlError error={error} />}
      <Flex
        css={{ paddingTop: 2 }}
        direction="column"
        gap="medium"
      >
        <Stepper
          compact
          steps={WEBHOOK_ACCESS_FORM_STEPS}
          stepIndex={stepIndex}
        />
        {currentStep === 'setup' ? (
          <>
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
                {Object.values(ObservabilityWebhookType).map((providerType) => (
                  <ListBoxItem
                    key={providerType}
                    leftContent={getObservabilityWebhookTypeIcon(providerType)}
                    label={humanizeObservabilityWebhookType(providerType)}
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
              <SecretInputWithGenerate
                masked
                defaultRevealed={false}
                value={formState.secret}
                onChange={(e) => updateFormState({ secret: e.target.value })}
              />
            </FormField>
          </>
        ) : (
          <WebhookAccessPolicyStep
            readBindings={readBindings.filter(isNonNullable)}
            writeBindings={writeBindings.filter(isNonNullable)}
            onReadBindingsChange={(next) =>
              updateFormState({ readBindings: next })
            }
            onWriteBindingsChange={(next) =>
              updateFormState({ writeBindings: next })
            }
          />
        )}
      </Flex>
      <Flex
        gap="small"
        justify="space-between"
        width="100%"
      >
        <Button
          secondary
          type="button"
          onClick={() => onClose?.()}
        >
          Cancel
        </Button>
        {currentStep === 'setup' ? (
          <Flex gap="small">
            <Button
              secondary
              type="button"
              onClick={() => setCurrentStep('access-policy')}
            >
              Configure access policy
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={!allowSubmitSetup}
            >
              {operationType === 'create' ? 'Create' : 'Update'}
            </Button>
          </Flex>
        ) : (
          <Flex gap="small">
            <Button
              secondary
              type="button"
              onClick={() => setCurrentStep('setup')}
            >
              Back to setup
            </Button>
            {operationType === 'update' ? (
              <Button
                type="button"
                loading={loading}
                disabled={!allowSavePolicy}
                onClick={() => void onSavePolicy()}
              >
                Save access policy
              </Button>
            ) : null}
          </Flex>
        )}
      </Flex>
    </WrapperSC>
  )
}

const WrapperSC = styled.form(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
}))

export function getObservabilityWebhookTypeIcon(
  type: Nullable<ObservabilityWebhookType>
) {
  switch (type) {
    case ObservabilityWebhookType.Alertops:
      return <AlertopsLogoIcon fullColor />
    case ObservabilityWebhookType.Grafana:
      return <GrafanaLogoIcon fullColor />
    case ObservabilityWebhookType.Datadog:
      return <DatadogLogoIcon fullColor />
    case ObservabilityWebhookType.Newrelic:
      return <NewrelicLogoIcon fullColor />
    case ObservabilityWebhookType.Pagerduty:
      return <PagerdutyLogoIcon fullColor />
    case ObservabilityWebhookType.Sentry:
      return <SentryLogoIcon fullColor />
    case ObservabilityWebhookType.Plural:
      return <PluralLogoIcon />
    default:
      return <WebhooksIcon />
  }
}
