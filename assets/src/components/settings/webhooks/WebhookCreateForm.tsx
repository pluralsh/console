import {
  Button,
  Codeline,
  Flex,
  FormField,
  ReturnIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { bindingToBindingAttributes } from 'components/utils/bindings'
import { PolicyBindingsCardForm } from 'components/utils/PolicyBindingsCardForm'
import { SettingsFormCard } from 'components/utils/SettingsFormCard'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { Body2P } from 'components/utils/typography/Text'
import {
  IssueWebhookAttributes,
  IssueWebhook,
  ObservabilityWebhookAttributes,
  ObservabilityWebhook,
  PolicyBindingFragment,
  useCreateIssueWebhookMutation,
  useUpdateIssueWebhookMutation,
  useUpsertObservabilityWebhookMutation,
} from 'generated/graphql'
import { useEffect, useState } from 'react'
import { isNonNullable } from 'utils/isNonNullable'

import { StickyActionsFooterSC } from 'components/workbenches/workbench/create-edit/WorkbenchCreateOrEdit'
import { WebhookCreateFormFields } from './WebhookCreateFormFields'
import {
  CreateWebhookFormState,
  ExistingWebhook,
  SetupGuideSelection,
} from './WebhookCreateFormTypes'
import { Overline } from 'components/cd/utils/PermissionsModal'

function getInitialCreateWebhookFormState(
  existingWebhook?: ExistingWebhook
): CreateWebhookFormState {
  if (existingWebhook?.webhookType === 'observability') {
    return {
      webhookType: 'observability',
      observabilityType: existingWebhook.webhook.type,
      observabilityName: existingWebhook.webhook.name,
      observabilitySecret: '',
      issueProvider: null,
      issueName: '',
      issueSecret: '',
      readBindings:
        existingWebhook.webhook.readBindings?.filter(isNonNullable) ?? [],
      writeBindings:
        existingWebhook.webhook.writeBindings?.filter(isNonNullable) ?? [],
    }
  }

  if (existingWebhook?.webhookType === 'issue') {
    return {
      webhookType: 'issue',
      observabilityType: null,
      observabilityName: '',
      observabilitySecret: '',
      issueProvider: existingWebhook.webhook.provider,
      issueName: existingWebhook.webhook.name,
      issueSecret: '',
      readBindings:
        existingWebhook.webhook.readBindings?.filter(isNonNullable) ?? [],
      writeBindings:
        existingWebhook.webhook.writeBindings?.filter(isNonNullable) ?? [],
    }
  }

  return {
    webhookType: 'observability',
    observabilityType: null,
    observabilityName: '',
    observabilitySecret: '',
    issueProvider: null,
    issueName: '',
    issueSecret: '',
    readBindings: [],
    writeBindings: [],
  }
}

function policyBindingsAttributes(bindings: PolicyBindingFragment[]) {
  return bindings.filter(isNonNullable).map(bindingToBindingAttributes)
}

function optionalSecret(secret: string) {
  const trimmedSecret = secret.trim()

  return trimmedSecret ? { secret: trimmedSecret } : {}
}

export function WebhookCreateForm({
  createdActionLabel = 'Attach Your Webhook',
  existingWebhook,
  mode = 'create',
  onGuideSelectionChange,
  onReturn,
  onSaved,
  returnPathIsList,
  refetchQueries,
  onCreated,
}: {
  createdActionLabel?: string
  existingWebhook?: ExistingWebhook
  mode?: 'create' | 'edit'
  onGuideSelectionChange: (selection: SetupGuideSelection) => void
  onReturn: () => void
  onSaved?: () => void
  returnPathIsList?: boolean
  refetchQueries?: string[]
  onCreated: (selectedWebhookKey: string) => void
}) {
  const { popToast } = useSimpleToast()
  const [formState, setFormState] = useState<CreateWebhookFormState>(() =>
    getInitialCreateWebhookFormState(existingWebhook)
  )
  const [newWebHook, setNewWebHook] =
    useState<Nullable<IssueWebhook | ObservabilityWebhook>>(null)

  const [upsertObservabilityWebhook, upsertObservabilityWebhookState] =
    useUpsertObservabilityWebhookMutation()
  const [createIssueWebhook, createIssueWebhookState] =
    useCreateIssueWebhookMutation()
  const [updateIssueWebhook, updateIssueWebhookState] =
    useUpdateIssueWebhookMutation()

  const isSaving =
    upsertObservabilityWebhookState.loading ||
    createIssueWebhookState.loading ||
    updateIssueWebhookState.loading

  const error =
    upsertObservabilityWebhookState.error ??
    createIssueWebhookState.error ??
    updateIssueWebhookState.error

  const isEdit = mode === 'edit'

  const canSubmitObservabilityWebhook =
    !!formState.observabilityType &&
    !!formState.observabilityName.trim() &&
    (isEdit || !!formState.observabilitySecret.trim())

  const canSubmitIssueWebhook =
    !!formState.issueProvider &&
    !!formState.issueName.trim() &&
    (isEdit || !!formState.issueSecret.trim())

  const canSubmitWebhook =
    formState.webhookType === 'observability'
      ? canSubmitObservabilityWebhook
      : canSubmitIssueWebhook

  useEffect(() => {
    onGuideSelectionChange({
      webhookType: formState.webhookType,
      observabilityType: formState.observabilityType,
      issueProvider: formState.issueProvider,
    })
  }, [
    formState.webhookType,
    formState.observabilityType,
    formState.issueProvider,
    onGuideSelectionChange,
  ])

  const handleCreateNewWebhook = async () => {
    if (!canSubmitWebhook) return

    if (formState.webhookType === 'observability') {
      const response = await upsertObservabilityWebhook({
        variables: {
          attributes: {
            type: formState.observabilityType!,
            name: formState.observabilityName.trim(),
            secret: formState.observabilitySecret.trim(),
            readBindings: policyBindingsAttributes(formState.readBindings),
            writeBindings: policyBindingsAttributes(formState.writeBindings),
          },
        },
        refetchQueries,
        awaitRefetchQueries: !!refetchQueries?.length,
      })

      const createdWebhook = response.data?.upsertObservabilityWebhook
      if (!createdWebhook) return

      setNewWebHook(createdWebhook)
      popToast({
        content: `${createdWebhook.name} created`,
        severity: 'success',
      })

      return
    }

    const response = await createIssueWebhook({
      variables: {
        attributes: {
          provider: formState.issueProvider!,
          name: formState.issueName.trim(),
          secret: formState.issueSecret.trim(),
          readBindings: policyBindingsAttributes(formState.readBindings),
          writeBindings: policyBindingsAttributes(formState.writeBindings),
        },
      },
      refetchQueries,
      awaitRefetchQueries: !!refetchQueries?.length,
    })

    const createdWebhook = response.data?.createIssueWebhook
    if (!createdWebhook) return

    setNewWebHook(createdWebhook)
    popToast({
      content: `${createdWebhook.name} created`,
      severity: 'success',
    })
  }

  const handleUpdateWebhook = async () => {
    if (!canSubmitWebhook || !existingWebhook) return

    if (formState.webhookType === 'observability') {
      const attributes: ObservabilityWebhookAttributes = {
        type: formState.observabilityType!,
        name: formState.observabilityName.trim(),
        ...optionalSecret(formState.observabilitySecret),
        readBindings: policyBindingsAttributes(formState.readBindings),
        writeBindings: policyBindingsAttributes(formState.writeBindings),
      }
      const response = await upsertObservabilityWebhook({
        variables: {
          attributes,
        },
        refetchQueries,
        awaitRefetchQueries: !!refetchQueries?.length,
      })

      const updatedWebhook = response.data?.upsertObservabilityWebhook
      if (!updatedWebhook) return

      popToast({
        content: `${updatedWebhook.name} updated`,
        severity: 'success',
      })
      onSaved?.()
      return
    }

    const attributes: IssueWebhookAttributes = {
      provider: formState.issueProvider!,
      name: formState.issueName.trim(),
      ...optionalSecret(formState.issueSecret),
      readBindings: policyBindingsAttributes(formState.readBindings),
      writeBindings: policyBindingsAttributes(formState.writeBindings),
    }
    const response = await updateIssueWebhook({
      variables: {
        id: existingWebhook.webhook.id,
        attributes,
      },
      refetchQueries,
      awaitRefetchQueries: !!refetchQueries?.length,
    })

    const updatedWebhook = response.data?.updateIssueWebhook
    if (!updatedWebhook) return

    popToast({
      content: `${updatedWebhook.name} updated`,
      severity: 'success',
    })
    onSaved?.()
  }

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
      overflow="hidden"
    >
      {error && <GqlError error={error} />}
      <Flex
        direction="column"
        gap="large"
        overflow="auto"
      >
        {newWebHook && !error && (
          <SettingsFormCard>
            <Overline>Webhook details</Overline>
            <Body2P>
              {`Add a new webhook in your ${formState.webhookType === 'observability' ? 'observability provider' : 'ticketing provider'} with the
            following url and validation secret`}
            </Body2P>
            <FormField label="Webhook URL">
              <Codeline>{newWebHook.url}</Codeline>
            </FormField>
            <FormField label="Secret">
              <Codeline>
                {formState.webhookType === 'observability'
                  ? formState.observabilitySecret
                  : formState.issueSecret}
              </Codeline>
            </FormField>
            <Button
              startIcon={returnPathIsList ? <ReturnIcon /> : undefined}
              onClick={() =>
                onCreated(
                  `${formState.webhookType === 'observability' ? 'obs' : 'issue'}:${newWebHook.id}`
                )
              }
              disabled={isSaving}
            >
              {createdActionLabel}
            </Button>
          </SettingsFormCard>
        )}
        {!newWebHook && (
          <>
            <SettingsFormCard>
              <Overline>Integration configuration</Overline>
              <WebhookCreateFormFields
                layout="horizontal"
                formState={formState}
                mode={mode}
                setFormState={setFormState}
              />
            </SettingsFormCard>
            <PolicyBindingsCardForm
              layout="horizontal"
              readTitle="Read permissions"
              writeTitle="Write permissions"
              readHints={{
                user: 'Users with read permissions for this webhook',
                group: 'Groups with read permissions for this webhook',
              }}
              writeHints={{
                user: 'Users with write permissions for this webhook',
                group: 'Groups with write permissions for this webhook',
              }}
              readBindings={formState.readBindings.filter(isNonNullable)}
              writeBindings={formState.writeBindings.filter(isNonNullable)}
              onReadBindingsChange={(next) =>
                setFormState((prev) => ({ ...prev, readBindings: next }))
              }
              onWriteBindingsChange={(next) =>
                setFormState((prev) => ({ ...prev, writeBindings: next }))
              }
            />
          </>
        )}
      </Flex>
      {!newWebHook && (
        <StickyActionsFooterSC
          css={{
            justifyContent: 'stretch',
            background: 'inherit',
            border: 'none',
            paddingTop: 0,
            marginTop: 0,
          }}
        >
          <Flex
            justify="right"
            wrap="wrap"
            align="center"
            width="100%"
            gap="small"
          >
            <Button
              secondary
              startIcon={returnPathIsList ? <ReturnIcon /> : undefined}
              onClick={onReturn}
              disabled={isSaving}
            >
              {returnPathIsList ? 'Back to all webhooks' : 'Back'}
            </Button>
            <Flex gap="small">
              <Button
                onClick={() =>
                  void (isEdit
                    ? handleUpdateWebhook()
                    : handleCreateNewWebhook())
                }
                loading={isSaving}
                disabled={!canSubmitWebhook}
              >
                {isEdit ? 'Update' : 'Create'}
              </Button>
            </Flex>
          </Flex>
        </StickyActionsFooterSC>
      )}
    </Flex>
  )
}
