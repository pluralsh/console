import {
  Button,
  EmptyState,
  Flex,
  FormField,
  Input2,
  ReturnIcon,
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
  CloudConnectionAttributes,
  GcpCloudConnectionAttributes,
  PolicyBindingFragment,
  Provider,
  useUpsertCloudConnectionMutation,
  WorkbenchToolType,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
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
import { isProvider, PROVIDER_TO_LABEL } from '../workbenchToolsUtils'

export function CloudConnectionCreateForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { popToast } = useSimpleToast()

  const providerParam = searchParams.get('provider')
  const provider = isProvider(providerParam) ? providerParam : null

  const returnParams = useMemo(() => {
    const params = new URLSearchParams({
      [WORKBENCHES_TOOLS_TYPE_PARAM]: WorkbenchToolType.Cloud,
    })
    if (provider) params.set(WORKBENCHES_TOOLS_PROVIDER_PARAM, provider)
    return params
  }, [provider])

  const [name, setName] = useState('')
  const [aws, setAws] = useState<AwsCloudConnectionAttributes>({
    accessKeyId: '',
    secretAccessKey: '',
    region: '',
    assumeRoleArn: '',
  })
  const [gcp, setGcp] = useState<GcpCloudConnectionAttributes>({
    serviceAccountKey: '',
    projectId: '',
  })
  const [azure, setAzure] = useState<AzureCloudConnectionAttributes>({
    subscriptionId: '',
    tenantId: '',
    clientId: '',
    clientSecret: '',
  })
  const [readBindings, setReadBindings] = useState<PolicyBindingFragment[]>([])

  const attributes = useMemo<Nullable<CloudConnectionAttributes>>(() => {
    if (!provider) return null
    const base = {
      name: name.trim(),
      provider,
      readBindings: readBindings.map(bindingToBindingAttributes),
    }
    switch (provider) {
      case Provider.Aws:
        return {
          ...base,
          configuration: {
            aws: {
              accessKeyId: aws.accessKeyId.trim(),
              secretAccessKey: aws.secretAccessKey,
              region: aws.region?.trim() || undefined,
              assumeRoleArn: aws.assumeRoleArn?.trim() || undefined,
            },
          },
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
    }
  }, [provider, name, readBindings, aws, gcp, azure])

  const [upsert, { loading, error }] = useUpsertCloudConnectionMutation({
    onCompleted: ({ upsertCloudConnection }) => {
      if (!upsertCloudConnection) return
      popToast({
        name: upsertCloudConnection.name,
        action: 'created',
        color: 'icon-success',
      })
      returnParams.set(
        CLOUD_CONNECTION_SELECTED_QUERY_PARAM,
        upsertCloudConnection.id
      )
      navigate(`${WORKBENCHES_TOOLS_CREATE_ABS_PATH}?${returnParams}`)
    },
    refetchQueries: ['CloudConnections'],
    awaitRefetchQueries: true,
  })

  if (!provider)
    return (
      <EmptyState message="Missing or invalid cloud provider">
        <Button
          as={Link}
          to={`${WORKBENCHES_TOOLS_CREATE_ABS_PATH}?${returnParams}`}
          startIcon={<ReturnIcon />}
        >
          Back
        </Button>
      </EmptyState>
    )

  const canSave =
    !!attributes &&
    !!name.trim() &&
    providerFieldsValid(provider, { aws, gcp, azure })

  return (
    <Flex
      direction="column"
      gap="medium"
      padding="large"
      maxWidth={750}
      minHeight={0}
    >
      {error && <GqlError error={error} />}

      <FormCardSC css={{ maxWidth: 750 }}>
        <OverlineH3 $color="text-xlight">
          New {PROVIDER_TO_LABEL[provider]} connection
        </OverlineH3>
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

        <Flex
          direction="column"
          gap="xsmall"
        >
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
        </Flex>
        <StickyActionsFooterSC css={{ justifyContent: 'flex-end' }}>
          <Button
            secondary
            as={Link}
            to={`${WORKBENCHES_TOOLS_CREATE_ABS_PATH}?${returnParams}`}
            disabled={loading}
          >
            Back
          </Button>
          <Button
            onClick={() => attributes && upsert({ variables: { attributes } })}
            loading={loading}
            disabled={!canSave}
          >
            Save
          </Button>
        </StickyActionsFooterSC>
      </FormCardSC>
    </Flex>
  )
}

function providerFieldsValid(
  provider: Provider,
  {
    aws,
    gcp,
    azure,
  }: {
    aws: AwsCloudConnectionAttributes
    gcp: GcpCloudConnectionAttributes
    azure: AzureCloudConnectionAttributes
  }
) {
  switch (provider) {
    case Provider.Aws:
      return !!aws.accessKeyId.trim() && !!aws.secretAccessKey
    case Provider.Gcp:
      return !!gcp.serviceAccountKey && !!gcp.projectId.trim()
    case Provider.Azure:
      return (
        !!azure.subscriptionId.trim() &&
        !!azure.tenantId.trim() &&
        !!azure.clientId.trim() &&
        !!azure.clientSecret
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
        required
        label="Access key ID"
      >
        <Input2
          value={state.accessKeyId}
          onChange={(e) => setState({ ...state, accessKeyId: e.target.value })}
        />
      </FormField>
      <FormField
        required
        label="Secret access key"
      >
        <InputRevealer
          value={state.secretAccessKey}
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
