import {
  Button,
  Flex,
  FormField,
  Input2,
  ListBoxItem,
  Select,
  SidePanelOpenIcon,
  Switch,
} from '@pluralsh/design-system'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { GqlError } from 'components/utils/Alert'
import {
  bindingToBindingAttributes,
  FormBindings,
} from 'components/utils/bindings'
import { EditableDiv } from 'components/utils/EditableDiv'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { OverlineH3 } from 'components/utils/typography/Text'
import {
  FormCardSC,
  StickyActionsFooterSC,
} from 'components/workbenches/workbench/create-edit/WorkbenchCreateOrEdit'
import {
  AwsCloudConnectionAttributes,
  AzureCloudConnectionAttributes,
  CloudConnectionFragment,
  CloudConnectionAttributes,
  GcpCloudConnectionAttributes,
  PolicyBindingFragment,
  Provider,
  useUpdateCloudConnectionMutation,
  useUpsertCloudConnectionMutation,
  VsphereCloudConnectionAttributes,
  WorkbenchToolType,
} from 'generated/graphql'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CLOUD_CONNECTION_SELECTED_QUERY_PARAM,
  WORKBENCHES_TOOLS_CREATE_ABS_PATH,
} from 'routes/workbenchesRoutesConsts'
import {
  WORKBENCHES_TOOLS_PROVIDER_PARAM,
  WORKBENCHES_TOOLS_TYPE_PARAM,
} from '../WorkbenchToolCreateOrEdit'
import { EditableDivWrapperSC } from '../WorkbenchToolFormFields'
import {
  getWorkbenchToolLabel,
  isProvider,
  PROVIDER_TO_ICON,
} from '../workbenchToolsUtils'
import {
  getCloudConnectionSetupGuideDocumentationUrl,
  getCloudConnectionSetupGuideMarkdownPath,
} from './cloudConnectionSetupGuides'
import { useWebhookSetupGuidePanel } from '../../workbench/webhooks/WebhookSetupGuidePanel'

export function CloudConnectionCreateForm({
  existingConnection,
  backPath,
  onSaved,
  selectableProvider = false,
  onProviderChange,
  showSetupGuideButton = true,
}: {
  existingConnection?: CloudConnectionFragment
  backPath?: string
  onSaved?: () => void
  selectableProvider?: boolean
  onProviderChange?: (provider: Provider) => void
  showSetupGuideButton?: boolean
}) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { popToast } = useSimpleToast()

  const providerParam = searchParams.get('provider')
  const [selectedProvider, setSelectedProvider] = useState<Provider>(
    isProvider(providerParam) ? providerParam : Provider.Aws
  )
  const provider =
    existingConnection?.provider ??
    (isProvider(providerParam) ? providerParam : selectedProvider)
  const isEditing = !!existingConnection
  const resolvedBackPath = backPath ?? WORKBENCHES_TOOLS_CREATE_ABS_PATH
  const { isOpen, openSetupGuidePanel, closeSetupGuidePanel } =
    useWebhookSetupGuidePanel()
  const setupGuideMarkdownPath = provider
    ? getCloudConnectionSetupGuideMarkdownPath(provider)
    : null
  const setupGuideDocumentationUrl = provider
    ? getCloudConnectionSetupGuideDocumentationUrl(provider)
    : undefined

  const returnParams = useMemo(() => {
    const params = new URLSearchParams({
      [WORKBENCHES_TOOLS_TYPE_PARAM]: WorkbenchToolType.Cloud,
    })
    if (provider) params.set(WORKBENCHES_TOOLS_PROVIDER_PARAM, provider)
    return params
  }, [provider])

  const [name, setName] = useState(existingConnection?.name ?? '')
  const [aws, setAws] = useState<AwsCloudConnectionAttributes>({
    accessKeyId: existingConnection?.configuration.aws?.accessKeyId ?? '',
    secretAccessKey: '',
    region: existingConnection?.configuration.aws?.region ?? '',
    assumeRoleArn: existingConnection?.configuration.aws?.assumeRoleArn ?? '',
  })
  const [gcp, setGcp] = useState<GcpCloudConnectionAttributes>({
    serviceAccountKey: '',
    projectId: existingConnection?.configuration.gcp?.projectId ?? '',
  })
  const [azure, setAzure] = useState<AzureCloudConnectionAttributes>({
    subscriptionId:
      existingConnection?.configuration.azure?.subscriptionId ?? '',
    tenantId: existingConnection?.configuration.azure?.tenantId ?? '',
    clientId: existingConnection?.configuration.azure?.clientId ?? '',
    clientSecret: '',
  })
  const [vsphere, setVsphere] = useState<VsphereCloudConnectionAttributes>({
    server: existingConnection?.configuration.vsphere?.server ?? '',
    user: existingConnection?.configuration.vsphere?.user ?? '',
    password: '',
    allowUnverifiedSsl:
      existingConnection?.configuration.vsphere?.allowUnverifiedSsl ?? false,
  })
  const [readBindings, setReadBindings] = useState<PolicyBindingFragment[]>(
    () =>
      (existingConnection?.readBindings?.filter(
        (binding): binding is PolicyBindingFragment => !!binding
      ) ?? []) as PolicyBindingFragment[]
  )

  const attributes = useMemo<Nullable<CloudConnectionAttributes>>(() => {
    if (!provider) return null
    const base = {
      name: name.trim(),
      provider,
      readBindings: readBindings.map(bindingToBindingAttributes),
    }
    switch (provider) {
      case Provider.Aws: {
        const cfg: AwsCloudConnectionAttributes = {}
        const accessKeyId = (aws.accessKeyId ?? '').trim()
        if (accessKeyId) cfg.accessKeyId = accessKeyId
        if (aws.secretAccessKey) cfg.secretAccessKey = aws.secretAccessKey
        if (aws.region?.trim()) cfg.region = aws.region.trim()
        if (aws.assumeRoleArn?.trim())
          cfg.assumeRoleArn = aws.assumeRoleArn.trim()
        return {
          ...base,
          configuration: { aws: cfg },
        }
      }
      case Provider.Gcp:
        return {
          ...base,
          configuration: {
            gcp: {
              serviceAccountKey: gcp.serviceAccountKey,
              projectId: gcp.projectId.trim(),
            },
          },
        }
      case Provider.Azure:
        return {
          ...base,
          configuration: {
            azure: {
              subscriptionId: azure.subscriptionId.trim(),
              tenantId: azure.tenantId.trim(),
              clientId: azure.clientId.trim(),
              clientSecret: azure.clientSecret,
            },
          },
        }
      case Provider.Vsphere:
        return {
          ...base,
          configuration: {
            vsphere: {
              server: vsphere.server.trim(),
              user: vsphere.user.trim(),
              password: vsphere.password,
              allowUnverifiedSsl: !!vsphere.allowUnverifiedSsl,
            },
          },
        }
    }
  }, [provider, name, readBindings, aws, gcp, azure, vsphere])

  const complete = (
    connection: { id: string; name: string } | null | undefined
  ) => {
    if (!connection) return
    popToast({
      content: `${connection.name} ${isEditing ? 'updated' : 'created'}`,
      severity: 'success',
    })
    if (onSaved) {
      onSaved()
      return
    }
    returnParams.set(CLOUD_CONNECTION_SELECTED_QUERY_PARAM, connection.id)
    navigate(`${WORKBENCHES_TOOLS_CREATE_ABS_PATH}?${returnParams}`)
  }
  const [upsert, { loading: upserting, error: upsertError }] =
    useUpsertCloudConnectionMutation({
      onCompleted: ({ upsertCloudConnection }) => {
        complete(upsertCloudConnection)
      },
      refetchQueries: ['CloudConnections'],
      awaitRefetchQueries: true,
    })
  const [update, { loading: updating, error: updateError }] =
    useUpdateCloudConnectionMutation({
      onCompleted: ({ updateCloudConnection }) => {
        complete(updateCloudConnection)
      },
      refetchQueries: ['CloudConnections'],
      awaitRefetchQueries: true,
    })
  const loading = upserting || updating
  const error = upsertError || updateError

  useEffect(() => {
    if (!isOpen) return
    if (!setupGuideMarkdownPath) {
      closeSetupGuidePanel()
      return
    }

    openSetupGuidePanel({
      documentationUrl: setupGuideDocumentationUrl,
      markdownPath: setupGuideMarkdownPath,
    })
  }, [
    isOpen,
    setupGuideMarkdownPath,
    setupGuideDocumentationUrl,
    openSetupGuidePanel,
    closeSetupGuidePanel,
  ])

  const canSave =
    !!attributes &&
    !!name.trim() &&
    providerFieldsValid(provider, { aws, gcp, azure, vsphere })

  return (
    <Flex
      direction="column"
      gap="medium"
      padding="large"
      minHeight={0}
      width="100%"
      css={{ maxWidth: 980, marginInline: 'auto' }}
    >
      {error && <GqlError error={error} />}

      <Flex
        gap="medium"
        justify={showSetupGuideButton ? undefined : 'center'}
      >
        <Flex
          direction="column"
          gap="large"
          css={{ maxWidth: 750, width: '100%' }}
        >
          <FormCardSC css={{ maxWidth: 750, width: '100%' }}>
            <OverlineH3 $color="text-xlight">
              {isEditing ? 'Edit' : 'New'}{' '}
              {getWorkbenchToolLabel(WorkbenchToolType.Cloud, provider)}{' '}
              connection
            </OverlineH3>
            {selectableProvider && !isEditing && (
              <FormField
                required
                label="Provider"
              >
                <Select
                  selectedKey={provider}
                  label="Cloud provider"
                  leftContent={(() => {
                    const ProviderIcon = PROVIDER_TO_ICON[provider]
                    return <ProviderIcon fullColor />
                  })()}
                  onSelectionChange={(key) => {
                    if (!key) return
                    const nextProvider = key as Provider
                    setSelectedProvider(nextProvider)
                    onProviderChange?.(nextProvider)
                  }}
                >
                  {Object.values(Provider).map((option) => {
                    const ProviderIcon = PROVIDER_TO_ICON[option]
                    return (
                      <ListBoxItem
                        key={option}
                        leftContent={<ProviderIcon fullColor />}
                        label={getWorkbenchToolLabel(
                          WorkbenchToolType.Cloud,
                          option
                        )}
                      />
                    )
                  })}
                </Select>
              </FormField>
            )}
            <FormField
              required
              label="Name"
            >
              <Input2
                placeholder="Connection name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>

            {provider === Provider.Aws && (
              <AwsFields
                state={aws}
                setState={setAws}
              />
            )}
            {provider === Provider.Gcp && (
              <GcpFields
                state={gcp}
                setState={setGcp}
              />
            )}
            {provider === Provider.Azure && (
              <AzureFields
                state={azure}
                setState={setAzure}
              />
            )}
            {provider === Provider.Vsphere && (
              <VSphereFields
                state={vsphere}
                setState={setVsphere}
              />
            )}
          </FormCardSC>

          <FormCardSC css={{ maxWidth: 750, width: '100%' }}>
            <OverlineH3 $color="text-xlight">Read permissions</OverlineH3>
            <FormBindings
              bindings={readBindings}
              setBindings={(next: PolicyBindingFragment[]) =>
                setReadBindings(next)
              }
              hints={{
                user: 'Users with read permissions for this connection',
                group: 'Groups with read permissions for this connection',
              }}
            />
          </FormCardSC>
          <StickyActionsFooterSC css={{ justifyContent: 'flex-end' }}>
            <Button
              secondary
              as={Link}
              to={resolvedBackPath}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              onClick={() => {
                if (!attributes) return
                if (existingConnection)
                  update({
                    variables: { id: existingConnection.id, attributes },
                  })
                else upsert({ variables: { attributes } })
              }}
              loading={loading}
              disabled={!canSave}
            >
              Save
            </Button>
          </StickyActionsFooterSC>
        </Flex>
        {showSetupGuideButton && !isOpen && !!setupGuideMarkdownPath && (
          <div css={{ width: 200 }}>
            <Button
              secondary
              startIcon={<SidePanelOpenIcon />}
              width="100%"
              css={{ whiteSpace: 'nowrap' }}
              onClick={() =>
                openSetupGuidePanel({
                  documentationUrl: setupGuideDocumentationUrl,
                  markdownPath: setupGuideMarkdownPath,
                })
              }
            >
              Setup guide
            </Button>
          </div>
        )}
      </Flex>
    </Flex>
  )
}

function providerFieldsValid(
  provider: Provider,
  fields: {
    aws: AwsCloudConnectionAttributes
    gcp: GcpCloudConnectionAttributes
    azure: AzureCloudConnectionAttributes
    vsphere: VsphereCloudConnectionAttributes
  }
) {
  switch (provider) {
    case Provider.Aws:
      return true
    case Provider.Gcp:
      return !!fields.gcp.serviceAccountKey && !!fields.gcp.projectId.trim()
    case Provider.Azure:
      return (
        !!fields.azure.subscriptionId.trim() &&
        !!fields.azure.tenantId.trim() &&
        !!fields.azure.clientId.trim() &&
        !!fields.azure.clientSecret
      )
    case Provider.Vsphere:
      return (
        !!fields.vsphere.server.trim() &&
        !!fields.vsphere.user.trim() &&
        !!fields.vsphere.password
      )
  }
}

function AwsFields({
  state,
  setState,
}: {
  state: AwsCloudConnectionAttributes
  setState: (next: AwsCloudConnectionAttributes) => void
}) {
  return (
    <>
      <FormField
        label="Access key ID"
        hint="Optional when the console uses workload identity (IRSA) or another ambient credential."
      >
        <Input2
          value={state.accessKeyId ?? ''}
          onChange={(e) => setState({ ...state, accessKeyId: e.target.value })}
        />
      </FormField>
      <FormField
        label="Secret access key"
        hint="Optional when not using static access keys."
      >
        <InputRevealer
          value={state.secretAccessKey ?? ''}
          onChange={(e) =>
            setState({ ...state, secretAccessKey: e.target.value })
          }
        />
      </FormField>
      <FormField label="Region">
        <Input2
          placeholder="us-east-1"
          value={state.region ?? ''}
          onChange={(e) => setState({ ...state, region: e.target.value })}
        />
      </FormField>
      <FormField
        label="Assume role ARN"
        hint="Optional IAM role ARN for the console to assume when using this connection."
      >
        <Input2
          placeholder="arn:aws:iam::123456789012:role/my-role"
          value={state.assumeRoleArn ?? ''}
          onChange={(e) =>
            setState({ ...state, assumeRoleArn: e.target.value })
          }
        />
      </FormField>
    </>
  )
}

function GcpFields({
  state,
  setState,
}: {
  state: GcpCloudConnectionAttributes
  setState: (next: GcpCloudConnectionAttributes) => void
}) {
  return (
    <>
      <FormField
        required
        label="Project ID"
      >
        <Input2
          value={state.projectId}
          onChange={(e) => setState({ ...state, projectId: e.target.value })}
        />
      </FormField>
      <FormField
        required
        label="Service account key (JSON)"
        hint="Paste the full JSON contents of the service-account key file."
      >
        <EditableDivWrapperSC>
          <EditableDiv
            initialValue={state.serviceAccountKey}
            setValue={(value) =>
              setState({ ...state, serviceAccountKey: value ?? '' })
            }
          />
        </EditableDivWrapperSC>
      </FormField>
    </>
  )
}

function AzureFields({
  state,
  setState,
}: {
  state: AzureCloudConnectionAttributes
  setState: (next: AzureCloudConnectionAttributes) => void
}) {
  return (
    <>
      <FormField
        required
        label="Subscription ID"
      >
        <Input2
          placeholder="00000000-0000-0000-0000-000000000000"
          value={state.subscriptionId}
          onChange={(e) =>
            setState({ ...state, subscriptionId: e.target.value })
          }
        />
      </FormField>
      <FormField
        required
        label="Tenant ID"
      >
        <Input2
          placeholder="00000000-0000-0000-0000-000000000000"
          value={state.tenantId}
          onChange={(e) => setState({ ...state, tenantId: e.target.value })}
        />
      </FormField>
      <FormField
        required
        label="Client ID"
      >
        <Input2
          placeholder="00000000-0000-0000-0000-000000000000"
          value={state.clientId}
          onChange={(e) => setState({ ...state, clientId: e.target.value })}
        />
      </FormField>
      <FormField
        required
        label="Client secret"
      >
        <InputRevealer
          value={state.clientSecret}
          onChange={(e) => setState({ ...state, clientSecret: e.target.value })}
        />
      </FormField>
    </>
  )
}

function VSphereFields({
  state,
  setState,
}: {
  state: VsphereCloudConnectionAttributes
  setState: (next: VsphereCloudConnectionAttributes) => void
}) {
  return (
    <>
      <FormField
        required
        label="vCenter SDK endpoint"
        hint="Use the vCenter SOAP SDK endpoint."
      >
        <Input2
          placeholder="https://vcenter.example.com/sdk"
          value={state.server}
          onChange={(e) => setState({ ...state, server: e.target.value })}
        />
      </FormField>
      <FormField
        required
        label="User"
      >
        <Input2
          placeholder="administrator@vsphere.local"
          value={state.user}
          onChange={(e) => setState({ ...state, user: e.target.value })}
        />
      </FormField>
      <FormField
        required
        label="Password"
      >
        <InputRevealer
          value={state.password}
          onChange={(e) => setState({ ...state, password: e.target.value })}
        />
      </FormField>
      <Switch
        checked={!!state.allowUnverifiedSsl}
        onChange={(checked) =>
          setState({ ...state, allowUnverifiedSsl: checked })
        }
      >
        Allow unverified TLS certificates
      </Switch>
    </>
  )
}
