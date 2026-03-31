import { DeepPartial } from '@apollo/client/utilities'
import {
  Button,
  Card,
  CodeEditor,
  Flex,
  FormField,
  Input2,
  ListBoxItem,
  MinusIcon,
  PlusIcon,
  Select,
} from '@pluralsh/design-system'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { EditableDiv } from 'components/utils/EditableDiv'
import { WorkbenchToolHttpMethod, WorkbenchToolType } from 'generated/graphql'
import { ComponentProps, ComponentType, useState } from 'react'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { isValidJson } from 'utils/isValidJson'
import {
  INITIAL_TOOL_CONFIG_BY_TYPE,
  WorkbenchToolFormState,
} from './WorkbenchToolForm'
import {
  ConfigForToolType,
  CONFIGURABLE_TOOL_TYPE_TO_CONFIG_KEY,
  ConfigurableWorkbenchToolType,
  isConfigurableWorkbenchToolType,
} from './workbenchToolsUtils'

type ToolFormFieldProps<T extends ConfigurableWorkbenchToolType> = {
  config: ConfigForToolType<T>
  setConfig: (next: ConfigForToolType<T>) => void
}

export function WorkbenchToolFormFields({
  type,
  state,
  update,
}: {
  type: WorkbenchToolType
  state: WorkbenchToolFormState
  update: (update: DeepPartial<WorkbenchToolFormState>) => void
}) {
  if (!isConfigurableWorkbenchToolType(type)) return null

  function render<T extends ConfigurableWorkbenchToolType>(
    t: T,
    Fields: ComponentType<ToolFormFieldProps<T>>
  ) {
    const key = CONFIGURABLE_TOOL_TYPE_TO_CONFIG_KEY[t]
    const config =
      state.configuration?.[key] ?? INITIAL_TOOL_CONFIG_BY_TYPE[type]({})[key]
    const setConfig = (next: ConfigForToolType<T>) =>
      update({ configuration: { ...state.configuration, [key]: next } })
    return (
      <Fields
        config={config}
        setConfig={setConfig}
      />
    )
  }

  switch (type) {
    case WorkbenchToolType.Datadog:
      return render(type, DatadogFormFields)
    case WorkbenchToolType.Elastic:
      return render(type, ElasticFormFields)
    case WorkbenchToolType.Http:
      return render(type, HttpFormFields)
    case WorkbenchToolType.Loki:
      return render(type, UrlUsernamePasswordTokenTenantFormFields)
    case WorkbenchToolType.Prometheus:
      return render(type, UrlUsernamePasswordTokenTenantFormFields)
    case WorkbenchToolType.Tempo:
      return render(type, UrlUsernamePasswordTokenTenantFormFields)
    case WorkbenchToolType.Atlassian:
      return render(type, AtlassianFormFields)
    case WorkbenchToolType.Linear:
      return render(type, LinearFormFields)
    case WorkbenchToolType.Splunk:
      return render(type, SplunkFormFields)
  }
}

function DatadogFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Datadog>) {
  return (
    <>
      <InputField
        label="Site"
        hint="e.g. datadoghq.com"
        placeholder="datadoghq.com"
        value={c.site ?? ''}
        onChange={(e) => set({ ...c, site: e.target.value || undefined })}
      />
      <InputField
        label="API key"
        required
        revealer
        value={c.apiKey ?? ''}
        onChange={(e) => set({ ...c, apiKey: e.target.value })}
      />
      <InputField
        label="Application key (optional)"
        revealer
        value={c.appKey ?? ''}
        onChange={(e) => set({ ...c, appKey: e.target.value || undefined })}
      />
    </>
  )
}

function ElasticFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Elastic>) {
  return (
    <>
      <InputField
        label="URL"
        required
        placeholder="Elasticsearch base URL"
        value={c.url ?? ''}
        onChange={(e) => set({ ...c, url: e.target.value })}
      />
      <InputField
        label="Index"
        required
        placeholder="Index name"
        value={c.index ?? ''}
        onChange={(e) => set({ ...c, index: e.target.value })}
      />
      <InputField
        label="Username"
        required
        placeholder="Basic auth username"
        value={c.username ?? ''}
        onChange={(e) => set({ ...c, username: e.target.value })}
      />
      <InputField
        label="Password"
        required
        revealer
        value={c.password ?? ''}
        onChange={(e) => set({ ...c, password: e.target.value })}
      />
    </>
  )
}

function HttpFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Http>) {
  const headers = c.headers?.filter(isNonNullable) ?? []

  function setHeader(index: number, field: 'name' | 'value', value: string) {
    const next = [...headers]
    if (!next[index]) next[index] = { name: '', value: '' }
    next[index] = { ...next[index], [field]: value }
    set({ ...c, headers: next })
  }

  function addHeader() {
    set({ ...c, headers: [...headers, { name: '', value: '' }] })
  }

  function removeHeader(index: number) {
    set({ ...c, headers: headers.filter((_, i) => i !== index) })
  }

  return (
    <>
      <InputField
        label="URL"
        required
        placeholder="Request URL"
        value={c.url ?? ''}
        onChange={(e) => set({ ...c, url: e.target.value })}
      />
      <FormField
        label="Method"
        required
      >
        <Select
          selectedKey={c.method ?? WorkbenchToolHttpMethod.Get}
          onSelectionChange={(key) =>
            set({
              ...c,
              method:
                (key as WorkbenchToolHttpMethod) ?? WorkbenchToolHttpMethod.Get,
            })
          }
          selectionMode="single"
          label="HTTP method"
        >
          {Object.values(WorkbenchToolHttpMethod).map((label) => (
            <ListBoxItem
              key={label}
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
      <InputField
        multiline
        label="Body"
        placeholder="Request body (optional)"
        initialValue={c.body ?? ''}
        setValue={(value) => set({ ...c, body: value || undefined })}
        css={{ minHeight: 56 }}
      />
      <JsonEditorField
        label="Input schema (JSON)"
        hint="JSON schema for the tool input"
        value={c.inputSchema as Record<string, unknown> | string | undefined}
        onChange={(jsonStr) => set({ ...c, inputSchema: jsonStr })}
      />
    </>
  )
}

function UrlUsernamePasswordTokenTenantFormFields<
  T extends
    | WorkbenchToolType.Loki
    | WorkbenchToolType.Prometheus
    | WorkbenchToolType.Tempo,
>({ config: c, setConfig: set }: ToolFormFieldProps<T>) {
  return (
    <>
      <InputField
        label="URL"
        required
        placeholder="Base URL"
        value={c.url ?? ''}
        onChange={(e) => set({ ...c, url: e.target.value })}
      />
      <InputField
        label="Username"
        placeholder="Basic auth username"
        value={c.username ?? ''}
        onChange={(e) => set({ ...c, username: e.target.value || undefined })}
      />
      <InputField
        label="Password"
        revealer
        value={c.password ?? ''}
        onChange={(e) => set({ ...c, password: e.target.value || undefined })}
      />
      <InputField
        label="Tenant ID"
        placeholder="Optional tenant id (e.g. for Mimir)"
        value={c.tenantId ?? ''}
        onChange={(e) => set({ ...c, tenantId: e.target.value || undefined })}
      />
      <InputField
        label="Bearer token / API key"
        revealer
        value={c.token ?? ''}
        onChange={(e) => set({ ...c, token: e.target.value || undefined })}
      />
    </>
  )
}

function AtlassianFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Atlassian>) {
  return (
    <>
      <InputField
        label="Email"
        hint="Atlassian account email (required if not using service account)"
        placeholder="Account email"
        value={c.email ?? ''}
        onChange={(e) => set({ ...c, email: e.target.value || undefined })}
      />
      <InputField
        label="API token"
        hint="Required if not using service account"
        revealer
        value={c.apiToken ?? ''}
        onChange={(e) => set({ ...c, apiToken: e.target.value || undefined })}
      />
      <InputField
        label="Service account (JSON)"
        hint="Encrypted service account JSON (alternative to API token + email)"
        revealer
        value={c.serviceAccount ?? ''}
        onChange={(e) =>
          set({ ...c, serviceAccount: e.target.value || undefined })
        }
      />
    </>
  )
}

function LinearFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Linear>) {
  return (
    <InputField
      label="Access token"
      required
      revealer
      value={c.accessToken ?? ''}
      onChange={(e) => set({ ...c, accessToken: e.target.value })}
    />
  )
}

function SplunkFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Splunk>) {
  return (
    <>
      <InputField
        label="URL"
        required
        placeholder="Splunk base URL"
        value={c.url ?? ''}
        onChange={(e) => set({ ...c, url: e.target.value })}
      />
      <InputField
        label="Username"
        placeholder="Basic auth username"
        value={c.username ?? ''}
        onChange={(e) => set({ ...c, username: e.target.value || undefined })}
      />
      <InputField
        label="Password"
        revealer
        value={c.password ?? ''}
        onChange={(e) => set({ ...c, password: e.target.value || undefined })}
      />
      <InputField
        label="Bearer token"
        revealer
        value={c.token ?? ''}
        onChange={(e) => set({ ...c, token: e.target.value || undefined })}
      />
    </>
  )
}

function JsonEditorField({
  hint,
  value,
  onChange,
  ...props
}: {
  value: Nullable<Record<string, unknown> | string>
  onChange: (jsonStr: string | undefined) => void
} & ComponentProps<typeof FormField>) {
  const [rawValue, setRawValue] = useState(() =>
    typeof value === 'object' ? JSON.stringify(value, null, 2) : (value ?? '')
  )
  const [isJsonInvalid, setIsJsonInvalid] = useState(false)

  return (
    <FormField
      {...props}
      hint={isJsonInvalid ? 'Invalid JSON' : hint}
      error={isJsonInvalid}
    >
      <CodeEditor
        value={rawValue}
        onChange={(raw) => {
          setRawValue(raw ?? '')
          if (isValidJson(raw)) {
            onChange(raw)
            setIsJsonInvalid(false)
          } else setIsJsonInvalid(true)
        }}
        language="json"
        height={160}
        options={{ lineNumbers: 'off', minimap: { enabled: false } }}
      />
    </FormField>
  )
}

type InputFieldProps = { label: string; hint?: string; required?: boolean } & (
  | ({ multiline: true } & ComponentProps<typeof EditableDiv>)
  | ({ multiline?: false; revealer?: boolean } & ComponentProps<typeof Input2>)
)
function InputField({ label, hint, required, ...props }: InputFieldProps) {
  return (
    <FormField
      label={label}
      hint={hint}
      required={required}
    >
      {props.multiline ? (
        <EditableDivWrapperSC>
          <EditableDiv {...props} />
        </EditableDivWrapperSC>
      ) : props.revealer ? (
        <InputRevealer {...props} />
      ) : (
        <Input2 {...props} />
      )}
    </FormField>
  )
}

export const EditableDivWrapperSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.medium,
  background: theme.colors['fill-zero'],
}))
