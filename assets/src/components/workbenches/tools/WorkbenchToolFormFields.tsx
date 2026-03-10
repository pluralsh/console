import {
  Button,
  Flex,
  FormField,
  Input,
  Input2,
  ListBoxItem,
  MinusIcon,
  PlusIcon,
  Select,
} from '@pluralsh/design-system'
import { DeepPartial } from '@apollo/client/utilities'
import {
  WorkbenchToolAtlassianConnectionAttributes,
  WorkbenchToolConfigurationAttributes,
  WorkbenchToolDatadogConnectionAttributes,
  WorkbenchToolElasticConnectionAttributes,
  WorkbenchToolHttpConfigurationAttributes,
  WorkbenchToolHttpHeaderAttributes,
  WorkbenchToolHttpMethod,
  WorkbenchToolLinearConnectionAttributes,
  WorkbenchToolLokiConnectionAttributes,
  WorkbenchToolPrometheusConnectionAttributes,
  WorkbenchToolTempoConnectionAttributes,
  WorkbenchToolType,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import {
  ConfigurableWorkbenchToolType,
  isConfigurableWorkbenchToolType,
} from './workbenchToolsConsts'
import { WorkbenchToolFormState } from './WorkbenchToolForm'

type UpdateFn = (update: DeepPartial<WorkbenchToolFormState>) => void

function getConfig<
  K extends keyof NonNullable<WorkbenchToolFormState['configuration']>,
>(
  state: WorkbenchToolFormState,
  key: K
): NonNullable<WorkbenchToolFormState['configuration']>[K] | undefined {
  return state.configuration?.[key]
}

function updateConfig(
  state: WorkbenchToolFormState,
  update: UpdateFn,
  key: keyof WorkbenchToolConfigurationAttributes,
  value: NonNullable<WorkbenchToolConfigurationAttributes[typeof key]>
) {
  update({
    configuration: {
      ...state.configuration,
      [key]: value,
    },
  })
}

/** Form field components keyed by configurable tool type. Exhaustive over ConfigurableWorkbenchToolType. */
const CONFIGURABLE_FORM_FIELDS: Record<
  ConfigurableWorkbenchToolType,
  (props: {
    state: WorkbenchToolFormState
    update: UpdateFn
  }) => React.ReactNode
> = {
  [WorkbenchToolType.Datadog]: (props) => <DatadogFormFields {...props} />,
  [WorkbenchToolType.Elastic]: (props) => <ElasticFormFields {...props} />,
  [WorkbenchToolType.Http]: (props) => <HttpFormFields {...props} />,
  [WorkbenchToolType.Loki]: (props) => <LokiFormFields {...props} />,
  [WorkbenchToolType.Prometheus]: (props) => (
    <PrometheusFormFields {...props} />
  ),
  [WorkbenchToolType.Tempo]: (props) => <TempoFormFields {...props} />,
  [WorkbenchToolType.Atlassian]: (props) => <AtlassianFormFields {...props} />,
  [WorkbenchToolType.Linear]: (props) => <LinearFormFields {...props} />,
}

export function WorkbenchToolFormFields({
  type,
  state,
  update,
}: {
  type: WorkbenchToolType
  state: WorkbenchToolFormState
  update: UpdateFn
}) {
  if (!isConfigurableWorkbenchToolType(type)) {
    return null
  }
  const Fields = CONFIGURABLE_FORM_FIELDS[type]
  return (
    <Fields
      state={state}
      update={update}
    />
  )
}

function DatadogFormFields({
  state,
  update,
}: {
  state: WorkbenchToolFormState
  update: UpdateFn
}) {
  const c = (getConfig(state, 'datadog') ??
    {}) as WorkbenchToolDatadogConnectionAttributes
  return (
    <>
      <FormField
        label="Site"
        hint="e.g. datadoghq.com"
      >
        <Input2
          placeholder="datadoghq.com"
          value={c.site ?? ''}
          onChange={(e) =>
            updateConfig(state, update, 'datadog', {
              ...c,
              apiKey: c.apiKey ?? '',
              site: e.target.value || undefined,
            })
          }
        />
      </FormField>
      <FormField
        label="API key"
        required
      >
        <InputRevealer
          value={c.apiKey ?? ''}
          onChange={(e) =>
            updateConfig(state, update, 'datadog', {
              ...c,
              apiKey: e.target.value,
              appKey: c.appKey,
              site: c.site,
            })
          }
        />
      </FormField>
      <FormField label="Application key (optional)">
        <InputRevealer
          value={c.appKey ?? ''}
          onChange={(e) =>
            updateConfig(state, update, 'datadog', {
              ...c,
              apiKey: c.apiKey ?? '',
              appKey: e.target.value || undefined,
            })
          }
        />
      </FormField>
    </>
  )
}

function ElasticFormFields({
  state,
  update,
}: {
  state: WorkbenchToolFormState
  update: UpdateFn
}) {
  const c = (getConfig(state, 'elastic') ??
    {}) as WorkbenchToolElasticConnectionAttributes
  return (
    <>
      <FormField
        label="URL"
        required
      >
        <Input2
          placeholder="Elasticsearch base URL"
          value={c.url ?? ''}
          onChange={(e) =>
            updateConfig(state, update, 'elastic', {
              ...c,
              url: e.target.value,
              index: c.index ?? '',
              username: c.username ?? '',
              password: c.password ?? '',
            })
          }
        />
      </FormField>
      <FormField
        label="Index"
        required
      >
        <Input2
          placeholder="Index name"
          value={c.index ?? ''}
          onChange={(e) =>
            updateConfig(state, update, 'elastic', {
              ...c,
              index: e.target.value,
              url: c.url ?? '',
              username: c.username ?? '',
              password: c.password ?? '',
            })
          }
        />
      </FormField>
      <FormField
        label="Username"
        required
      >
        <Input2
          placeholder="Basic auth username"
          value={c.username ?? ''}
          onChange={(e) =>
            updateConfig(state, update, 'elastic', {
              ...c,
              username: e.target.value,
              url: c.url ?? '',
              index: c.index ?? '',
              password: c.password ?? '',
            })
          }
        />
      </FormField>
      <FormField
        label="Password"
        required
      >
        <InputRevealer
          value={c.password ?? ''}
          onChange={(e) =>
            updateConfig(state, update, 'elastic', {
              ...c,
              password: e.target.value,
              url: c.url ?? '',
              index: c.index ?? '',
              username: c.username ?? '',
            })
          }
        />
      </FormField>
    </>
  )
}

const HTTP_METHOD_OPTIONS: { key: WorkbenchToolHttpMethod; label: string }[] = [
  { key: WorkbenchToolHttpMethod.Get, label: 'GET' },
  { key: WorkbenchToolHttpMethod.Post, label: 'POST' },
  { key: WorkbenchToolHttpMethod.Put, label: 'PUT' },
  { key: WorkbenchToolHttpMethod.Patch, label: 'PATCH' },
  { key: WorkbenchToolHttpMethod.Delete, label: 'DELETE' },
]

function HttpFormFields({
  state,
  update,
}: {
  state: WorkbenchToolFormState
  update: UpdateFn
}) {
  const c = (getConfig(state, 'http') ??
    {}) as WorkbenchToolHttpConfigurationAttributes
  const headers = (c.headers?.filter(isNonNullable) ??
    []) as WorkbenchToolHttpHeaderAttributes[]

  function setHttp(
    partial: Partial<
      NonNullable<WorkbenchToolFormState['configuration']>['http']
    >
  ) {
    updateConfig(state, update, 'http', {
      url: c.url ?? '',
      method: c.method ?? WorkbenchToolHttpMethod.Get,
      body: c.body,
      headers: c.headers,
      inputSchema: c.inputSchema,
      ...partial,
    })
  }

  function setHeader(index: number, field: 'name' | 'value', value: string) {
    const next = [...headers]
    if (!next[index]) next[index] = { name: '', value: '' }
    next[index] = { ...next[index], [field]: value }
    setHttp({ headers: next })
  }

  function addHeader() {
    setHttp({ headers: [...headers, { name: '', value: '' }] })
  }

  function removeHeader(index: number) {
    setHttp({
      headers: headers.filter((_, i) => i !== index),
    })
  }

  return (
    <>
      <FormField
        label="URL"
        required
      >
        <Input2
          placeholder="Request URL"
          value={c.url ?? ''}
          onChange={(e) => setHttp({ url: e.target.value })}
        />
      </FormField>
      <FormField
        label="Method"
        required
      >
        <Select
          selectedKey={c.method ?? WorkbenchToolHttpMethod.Get}
          onSelectionChange={(key) =>
            setHttp({
              method:
                (key as WorkbenchToolHttpMethod) ?? WorkbenchToolHttpMethod.Get,
            })
          }
          selectionMode="single"
          label="HTTP method"
        >
          {HTTP_METHOD_OPTIONS.map(({ key, label }) => (
            <ListBoxItem
              key={key}
              label={label}
            />
          ))}
        </Select>
      </FormField>
      <FormField label="Headers">
        <Flex
          direction="column"
          gap="small"
        >
          {headers.map((h, i) => (
            <Flex
              key={i}
              gap="xsmall"
              align="center"
            >
              <Input2
                placeholder="Name"
                value={h.name ?? ''}
                onChange={(e) => setHeader(i, 'name', e.target.value)}
                css={{ flex: 1 }}
              />
              <Input2
                placeholder="Value"
                value={h.value ?? ''}
                onChange={(e) => setHeader(i, 'value', e.target.value)}
                css={{ flex: 1 }}
              />
              <Button
                tertiary
                destructive
                small
                startIcon={<MinusIcon size={12} />}
                onClick={() => removeHeader(i)}
              />
            </Flex>
          ))}
          <Button
            secondary
            small
            startIcon={<PlusIcon />}
            onClick={addHeader}
          >
            Add header
          </Button>
        </Flex>
      </FormField>
      <FormField label="Body">
        <Input
          multiline
          minRows={2}
          maxRows={6}
          placeholder="Request body (optional)"
          value={c.body ?? ''}
          onChange={(e) => setHttp({ body: e.target.value || undefined })}
        />
      </FormField>
      <FormField
        label="Input schema (JSON)"
        hint="JSON schema for the tool input"
      >
        <Input
          multiline
          minRows={4}
          maxRows={12}
          placeholder='{"type":"object",...}'
          value={
            typeof c.inputSchema === 'object'
              ? JSON.stringify(c.inputSchema, null, 2)
              : ((c.inputSchema as string) ?? '')
          }
          onChange={(e) => {
            const raw = e.target.value
            if (!raw.trim()) {
              setHttp({ inputSchema: undefined })
              return
            }
            try {
              setHttp({
                inputSchema: JSON.parse(raw) as Record<string, unknown>,
              })
            } catch {
              // allow invalid JSON while typing
              setHttp({ inputSchema: undefined })
            }
          }}
        />
      </FormField>
    </>
  )
}

type UrlUsernamePasswordTokenTenant =
  | WorkbenchToolLokiConnectionAttributes
  | WorkbenchToolPrometheusConnectionAttributes
  | WorkbenchToolTempoConnectionAttributes

function urlUsernamePasswordTokenTenantFields(
  providerKey: 'loki' | 'prometheus' | 'tempo',
  state: WorkbenchToolFormState,
  update: UpdateFn,
  c: UrlUsernamePasswordTokenTenant
) {
  const set = (partial: Partial<UrlUsernamePasswordTokenTenant>) =>
    updateConfig(state, update, providerKey, {
      ...c,
      ...partial,
    } as NonNullable<WorkbenchToolConfigurationAttributes[typeof providerKey]>)

  return (
    <>
      <FormField
        label="URL"
        required
      >
        <Input2
          placeholder="Base URL"
          value={c.url ?? ''}
          onChange={(e) => set({ url: e.target.value })}
        />
      </FormField>
      <FormField label="Username">
        <Input2
          placeholder="Basic auth username"
          value={c.username ?? ''}
          onChange={(e) => set({ username: e.target.value || undefined })}
        />
      </FormField>
      <FormField label="Password">
        <InputRevealer
          value={c.password ?? ''}
          onChange={(e) => set({ password: e.target.value || undefined })}
        />
      </FormField>
      <FormField label="Tenant ID">
        <Input2
          placeholder="Optional tenant id (e.g. for Mimir)"
          value={c.tenantId ?? ''}
          onChange={(e) => set({ tenantId: e.target.value || undefined })}
        />
      </FormField>
      <FormField label="Bearer token / API key">
        <InputRevealer
          value={c.token ?? ''}
          onChange={(e) => set({ token: e.target.value || undefined })}
        />
      </FormField>
    </>
  )
}

function LokiFormFields({
  state,
  update,
}: {
  state: WorkbenchToolFormState
  update: UpdateFn
}) {
  const c = (getConfig(state, 'loki') ??
    {}) as WorkbenchToolLokiConnectionAttributes
  return urlUsernamePasswordTokenTenantFields('loki', state, update, c)
}

function PrometheusFormFields({
  state,
  update,
}: {
  state: WorkbenchToolFormState
  update: UpdateFn
}) {
  const c = (getConfig(state, 'prometheus') ??
    {}) as WorkbenchToolPrometheusConnectionAttributes
  return urlUsernamePasswordTokenTenantFields('prometheus', state, update, c)
}

function TempoFormFields({
  state,
  update,
}: {
  state: WorkbenchToolFormState
  update: UpdateFn
}) {
  const c = (getConfig(state, 'tempo') ??
    {}) as WorkbenchToolTempoConnectionAttributes
  return urlUsernamePasswordTokenTenantFields('tempo', state, update, c)
}

function AtlassianFormFields({
  state,
  update,
}: {
  state: WorkbenchToolFormState
  update: UpdateFn
}) {
  const c = (getConfig(state, 'atlassian') ??
    {}) as WorkbenchToolAtlassianConnectionAttributes
  return (
    <>
      <FormField
        label="Email"
        hint="Atlassian account email (required if not using service account)"
      >
        <Input2
          placeholder="Account email"
          value={c.email ?? ''}
          onChange={(e) =>
            updateConfig(state, update, 'atlassian', {
              ...c,
              email: e.target.value || undefined,
              apiToken: c.apiToken,
              serviceAccount: c.serviceAccount,
            })
          }
        />
      </FormField>
      <FormField
        label="API token"
        hint="Required if not using service account"
      >
        <InputRevealer
          value={c.apiToken ?? ''}
          onChange={(e) =>
            updateConfig(state, update, 'atlassian', {
              ...c,
              apiToken: e.target.value || undefined,
              email: c.email,
              serviceAccount: c.serviceAccount,
            })
          }
        />
      </FormField>
      <FormField
        label="Service account (JSON)"
        hint="Encrypted service account JSON (alternative to API token + email)"
      >
        <InputRevealer
          value={c.serviceAccount ?? ''}
          onChange={(e) =>
            updateConfig(state, update, 'atlassian', {
              ...c,
              serviceAccount: e.target.value || undefined,
              email: c.email,
              apiToken: c.apiToken,
            })
          }
        />
      </FormField>
    </>
  )
}

function LinearFormFields({
  state,
  update,
}: {
  state: WorkbenchToolFormState
  update: UpdateFn
}) {
  const c = (getConfig(state, 'linear') ??
    {}) as WorkbenchToolLinearConnectionAttributes
  return (
    <FormField
      label="Access token"
      required
    >
      <InputRevealer
        value={c.accessToken ?? ''}
        onChange={(e) =>
          updateConfig(state, update, 'linear', {
            ...c,
            accessToken: e.target.value,
          })
        }
      />
    </FormField>
  )
}
