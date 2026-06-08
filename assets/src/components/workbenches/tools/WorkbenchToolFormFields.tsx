import { DeepPartial } from '@apollo/client/utilities'
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CodeEditor,
  Flex,
  FormField,
  Input2,
  ListBoxItem,
  AddIcon,
  MinusIcon,
  Select,
  Switch,
} from '@pluralsh/design-system'
import SshKeyUpload from 'components/cd/utils/SshKeyUpload'
import { InputRevealer } from 'components/cd/providers/InputRevealer'
import { EditableDiv } from 'components/utils/EditableDiv'
import { WorkbenchToolHttpMethod, WorkbenchToolType } from 'generated/graphql'
import { ComponentProps, ComponentType, useState } from 'react'
import styled, { useTheme } from 'styled-components'
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
    case WorkbenchToolType.Opensearch:
      return render(type, OpensearchFormFields)
    case WorkbenchToolType.Http:
      return render(type, HttpFormFields)
    case WorkbenchToolType.Loki:
      return render(type, UrlUsernamePasswordTokenTenantFormFields)
    case WorkbenchToolType.Prometheus:
      return render(type, PrometheusFormFields)
    case WorkbenchToolType.Tempo:
      return render(type, UrlUsernamePasswordTokenTenantFormFields)
    case WorkbenchToolType.Jaeger:
      return render(type, JaegerFormFields)
    case WorkbenchToolType.Atlassian:
      return render(type, AtlassianFormFields)
    case WorkbenchToolType.Linear:
      return render(type, LinearFormFields)
    case WorkbenchToolType.Slack:
      return render(type, SlackFormFields)
    case WorkbenchToolType.Pagerduty:
      return render(type, PagerdutyFormFields)
    case WorkbenchToolType.Teams:
      return render(type, TeamsFormFields)
    case WorkbenchToolType.Exa:
      return render(type, ExaFormFields)
    case WorkbenchToolType.Github:
      return render(type, GithubFormFields)
    case WorkbenchToolType.Gitlab:
      return render(type, GitlabFormFields)
    case WorkbenchToolType.Bitbucket:
      return render(type, BitbucketFormFields)
    case WorkbenchToolType.BitbucketDatacenter:
      return render(type, BitbucketDatacenterFormFields)
    case WorkbenchToolType.AzureDevops:
      return render(type, AzureDevopsFormFields)
    case WorkbenchToolType.Splunk:
      return render(type, SplunkFormFields)
    case WorkbenchToolType.Cloudwatch:
      return render(type, CloudwatchFormFields)
    case WorkbenchToolType.Azure:
      return render(type, AzureFormFields)
    case WorkbenchToolType.Dynatrace:
      return render(type, DynatraceFormFields)
    case WorkbenchToolType.Sentry:
      return render(type, SentryFormFields)
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

function OpensearchFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Opensearch>) {
  const { colors } = useTheme()
  const usePodIdentity = !!c.usePodIdentity

  return (
    <>
      <InputField
        label="Host"
        required
        placeholder="https://search-domain.us-east-1.es.amazonaws.com"
        value={c.host ?? ''}
        onChange={(e) => set({ ...c, host: e.target.value })}
      />
      <InputField
        label="Index"
        required
        placeholder="Index name"
        value={c.index ?? ''}
        onChange={(e) => set({ ...c, index: e.target.value })}
      />
      <InputField
        label="AWS region"
        placeholder="us-east-1"
        value={c.awsRegion ?? ''}
        onChange={(e) => set({ ...c, awsRegion: e.target.value || undefined })}
      />
      <InputField
        label="Assume role ARN"
        hint="Optional IAM role ARN to assume before signing OpenSearch requests."
        placeholder="arn:aws:iam::123456789012:role/opensearch-readonly"
        value={c.assumeRoleArn ?? ''}
        onChange={(e) =>
          set({ ...c, assumeRoleArn: e.target.value || undefined })
        }
      />
      <Switch
        checked={usePodIdentity}
        onChange={(checked) =>
          set({
            ...c,
            usePodIdentity: checked,
            ...(checked
              ? {
                  awsAccessKeyId: undefined,
                  awsSecretAccessKey: undefined,
                }
              : {}),
          })
        }
      >
        Use pod identity / IRSA
      </Switch>
      <p
        css={{
          margin: 0,
          fontSize: 14,
          color: colors['text-xlight'],
        }}
      >
        {usePodIdentity
          ? 'Requests will be signed with AWS SigV4 using credentials available to the Console runtime, such as IRSA, pod identity, or another default AWS credential source.'
          : 'Provide static AWS credentials for SigV4 signing, or enable pod identity / IRSA to use credentials available to the Console runtime.'}
      </p>
      {!usePodIdentity && (
        <>
          <InputField
            label="Access key ID"
            required
            value={c.awsAccessKeyId ?? ''}
            onChange={(e) =>
              set({ ...c, awsAccessKeyId: e.target.value || undefined })
            }
          />
          <InputField
            label="Secret access key"
            hint="Leave blank when editing to keep the stored secret unless you are rotating it."
            required
            revealer
            value={c.awsSecretAccessKey ?? ''}
            onChange={(e) =>
              set({ ...c, awsSecretAccessKey: e.target.value || undefined })
            }
          />
        </>
      )}
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
            startIcon={<AddIcon />}
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

function PrometheusFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Prometheus>) {
  const { colors } = useTheme()
  const sigv4Enabled = !!c.awsSigv4

  return (
    <>
      <UrlUsernamePasswordTokenTenantFormFields
        config={c}
        setConfig={set}
      />
      <Switch
        checked={sigv4Enabled}
        onChange={(checked) =>
          set({
            ...c,
            awsSigv4: checked,
            ...(checked
              ? {}
              : {
                  awsAccessKeyId: undefined,
                  awsSecretAccessKey: undefined,
                  awsRegion: undefined,
                }),
          })
        }
      >
        Sign requests with AWS SigV4
      </Switch>
      {sigv4Enabled && (
        <Flex
          direction="column"
          gap="medium"
        >
          <p
            css={{
              margin: 0,
              fontSize: 14,
              color: colors['text-xlight'],
            }}
          >
            Provide static credentials here, or leave them blank to use IRSA,
            pod identity, or another AWS credential source available to the
            Console runtime.
          </p>
          <InputField
            label="AWS region"
            placeholder="us-east-1"
            value={c.awsRegion ?? ''}
            onChange={(e) =>
              set({ ...c, awsRegion: e.target.value || undefined })
            }
          />
          <InputField
            label="Access key ID"
            value={c.awsAccessKeyId ?? ''}
            onChange={(e) =>
              set({ ...c, awsAccessKeyId: e.target.value || undefined })
            }
          />
          <InputField
            label="Secret access key"
            hint="Leave blank when editing to keep the stored secret unless you are rotating it."
            revealer
            value={c.awsSecretAccessKey ?? ''}
            onChange={(e) =>
              set({ ...c, awsSecretAccessKey: e.target.value || undefined })
            }
          />
        </Flex>
      )}
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

function SlackFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Slack>) {
  return (
    <InputField
      label="Bot user OAuth token"
      hint="Starts with xoxb-. Create a Slack app, add bot scopes, install to your workspace, then copy the Bot User OAuth Token from OAuth & Permissions."
      required
      revealer
      value={c.botToken ?? ''}
      onChange={(e) => set({ ...c, botToken: e.target.value })}
    />
  )
}

function PagerdutyFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Pagerduty>) {
  return (
    <InputField
      label="API token"
      hint="PagerDuty REST API key from Integrations → API Access Keys. Used as Token token=… for incident lookups."
      required
      revealer
      value={c.apiToken ?? ''}
      onChange={(e) => set({ ...c, apiToken: e.target.value })}
    />
  )
}

function TeamsFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Teams>) {
  return (
    <>
      <InputField
        label="Tenant (directory) ID"
        hint="Microsoft Entra ID → Overview → Tenant ID. Used for the OAuth token endpoint."
        required
        placeholder="00000000-0000-0000-0000-000000000000"
        value={c.tenantId ?? ''}
        onChange={(e) => set({ ...c, tenantId: e.target.value })}
      />
      <InputField
        label="Application (client) ID"
        hint="App registration → Overview → Application (client) ID."
        required
        placeholder="00000000-0000-0000-0000-000000000000"
        value={c.clientId ?? ''}
        onChange={(e) => set({ ...c, clientId: e.target.value })}
      />
      <InputField
        label="Client secret"
        hint="App registration → Certificates & secrets (client secret value)."
        required
        revealer
        value={c.clientSecret ?? ''}
        onChange={(e) => set({ ...c, clientSecret: e.target.value })}
      />
    </>
  )
}

function ExaFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Exa>) {
  return (
    <InputField
      label="API key (optional)"
      hint="Leave blank to use the server-side Exa API key if configured."
      revealer
      value={c.apiKey ?? ''}
      onChange={(e) => set({ ...c, apiKey: e.target.value || undefined })}
    />
  )
}

const GITHUB_NATIVE_TOOLSET_OPTIONS = [
  {
    key: 'default',
    label: 'All (issues, pull requests, repos)',
  },
  { key: 'issues', label: 'Issues only' },
  { key: 'pull_requests', label: 'Pull requests only' },
  { key: 'repos', label: 'Repos only' },
] as const

function githubNativeToolsetSelectKey(
  toolset: string | null | undefined
): (typeof GITHUB_NATIVE_TOOLSET_OPTIONS)[number]['key'] {
  if (
    !toolset ||
    toolset === '' ||
    toolset === 'default' ||
    toolset === 'all'
  ) {
    return 'default'
  }
  if (
    toolset === 'issues' ||
    toolset === 'pull_requests' ||
    toolset === 'repos'
  ) {
    return toolset
  }

  return 'default'
}

function GitlabFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Gitlab>) {
  return (
    <>
      <InputField
        label="API URL"
        hint="Optional. Defaults to https://gitlab.com. Set the base URL for self-managed GitLab."
        placeholder="https://gitlab.com"
        value={c.url ?? ''}
        onChange={(e) => set({ ...c, url: e.target.value || undefined })}
      />
      <InputField
        label="Access token"
        required
        revealer
        hint="Personal, project, or group access token (encrypted at rest)."
        value={c.token ?? ''}
        onChange={(e) => set({ ...c, token: e.target.value })}
      />
    </>
  )
}

function BitbucketFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Bitbucket>) {
  return (
    <>
      <InputField
        label="API URL"
        hint="Optional. Override when using a non-default Bitbucket Cloud API endpoint."
        placeholder="https://api.bitbucket.org/2.0"
        value={c.url ?? ''}
        onChange={(e) => set({ ...c, url: e.target.value || undefined })}
      />
      <InputField
        label="App password or access token"
        required
        revealer
        value={c.token ?? ''}
        onChange={(e) => set({ ...c, token: e.target.value })}
      />
    </>
  )
}

function BitbucketDatacenterFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.BitbucketDatacenter>) {
  return (
    <>
      <InputField
        label="REST API base URL"
        required
        hint="Bitbucket Data Center REST API root, e.g. https://bitbucket.example.com/rest/api/1.0"
        placeholder="https://bitbucket.example.com/rest/api/1.0"
        value={c.url ?? ''}
        onChange={(e) => set({ ...c, url: e.target.value })}
      />
      <InputField
        label="HTTP access token"
        required
        revealer
        value={c.token ?? ''}
        onChange={(e) => set({ ...c, token: e.target.value })}
      />
    </>
  )
}

function AzureDevopsFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.AzureDevops>) {
  return (
    <InputField
      label="Personal access token (PAT)"
      required
      revealer
      hint="Create a PAT with Code (read) / Code (write) or the scopes your workflows need."
      value={c.token ?? ''}
      onChange={(e) => set({ ...c, token: e.target.value })}
    />
  )
}

function GithubFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Github>) {
  const { colors } = useTheme()

  return (
    <>
      <InputField
        label="API URL"
        hint="Optional. Defaults to https://api.github.com/. Set your GitHub Enterprise Server API root if needed."
        placeholder="https://api.github.com/"
        value={c.url ?? ''}
        onChange={(e) => set({ ...c, url: e.target.value || undefined })}
      />
      <InputField
        label="Access token"
        hint="Optional if you configure GitHub App credentials below. Leave blank when editing if the token is unchanged."
        revealer
        value={c.accessToken ?? ''}
        onChange={(e) => set({ ...c, accessToken: e.target.value })}
      />
      <FormField
        label="Toolset"
        hint="Optional. Restrict which GitHub tool groups are registered; omit or choose All to enable every supported tool."
      >
        <Select
          selectedKey={githubNativeToolsetSelectKey(c.toolset)}
          onSelectionChange={(key) => {
            if (typeof key !== 'string') return
            set({
              ...c,
              toolset: key === 'default' ? undefined : key,
            })
          }}
          selectionMode="single"
          label="GitHub toolset"
        >
          {GITHUB_NATIVE_TOOLSET_OPTIONS.map((option) => (
            <ListBoxItem
              key={option.key}
              label={option.label}
            />
          ))}
        </Select>
      </FormField>
      <Accordion type="single">
        <AccordionItem trigger="GitHub App authentication">
          <Flex
            direction="column"
            gap="medium"
          >
            <p
              css={{
                margin: 0,
                fontSize: 14,
                color: colors['text-xlight'],
              }}
            >
              Alternative to a personal access token. Provide App ID,
              Installation ID, and the app&apos;s PEM private key. When editing,
              leave the key blank to keep the stored key unless you are rotating
              it.
            </p>
            <Flex
              gap="medium"
              width="100%"
              css={{ '& > *': { flex: 1 } }}
            >
              <InputField
                label="App ID"
                placeholder="123456"
                value={c.appId ?? ''}
                onChange={(e) =>
                  set({ ...c, appId: e.target.value || undefined })
                }
              />
              <InputField
                label="Installation ID"
                placeholder="12345678"
                value={c.installationId ?? ''}
                onChange={(e) =>
                  set({ ...c, installationId: e.target.value || undefined })
                }
              />
            </Flex>
            <SshKeyUpload
              fillLevel={2}
              required={false}
              label="App private key (PEM)"
              privateKey={c.privateKey}
              setPrivateKey={(key) =>
                set({ ...c, privateKey: key ?? undefined })
              }
            />
          </Flex>
        </AccordionItem>
      </Accordion>
    </>
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

function CloudwatchFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Cloudwatch>) {
  return (
    <>
      <InputField
        label="Region"
        required
        placeholder="us-east-1"
        value={c.region ?? ''}
        onChange={(e) => set({ ...c, region: e.target.value })}
      />
      <InputField
        label="Role ARN"
        placeholder="arn:aws:iam::123456789012:role/my-role"
        value={c.roleArn ?? ''}
        onChange={(e) => set({ ...c, roleArn: e.target.value || undefined })}
      />
      <InputField
        label="Role session name"
        placeholder="plural-workbench"
        value={c.roleSessionName ?? ''}
        onChange={(e) =>
          set({ ...c, roleSessionName: e.target.value || undefined })
        }
      />
      <InputField
        label="External ID"
        placeholder="Optional assume-role external id"
        value={c.externalId ?? ''}
        onChange={(e) => set({ ...c, externalId: e.target.value || undefined })}
      />
      <InputField
        label="Access key ID"
        value={c.accessKeyId ?? ''}
        onChange={(e) =>
          set({ ...c, accessKeyId: e.target.value || undefined })
        }
      />
      <InputField
        label="Secret access key"
        revealer
        value={c.secretAccessKey ?? ''}
        onChange={(e) =>
          set({ ...c, secretAccessKey: e.target.value || undefined })
        }
      />
      <InputField
        multiline
        label="Default log groups"
        hint="One log group name per line"
        initialValue={(c.logGroupNames ?? []).filter(isNonNullable).join('\n')}
        setValue={(value) =>
          set({
            ...c,
            logGroupNames:
              value
                ?.split('\n')
                .map((v) => v.trim())
                .filter(Boolean) ?? [],
          })
        }
      />
    </>
  )
}

function DynatraceFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Dynatrace>) {
  return (
    <>
      <InputField
        label="URL"
        required
        placeholder="https://{tenant}.live.dynatrace.com"
        value={c.url ?? ''}
        onChange={(e) => set({ ...c, url: e.target.value })}
      />
      <InputField
        label="Platform token"
        required
        revealer
        value={c.platformToken ?? ''}
        onChange={(e) => set({ ...c, platformToken: e.target.value })}
      />
    </>
  )
}

function SentryFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Sentry>) {
  return (
    <>
      <InputField
        label="URL"
        hint="Optional. Defaults to https://sentry.io. Set the base URL for self-hosted Sentry."
        placeholder="https://sentry.io"
        value={c.url ?? ''}
        onChange={(e) => set({ ...c, url: e.target.value || undefined })}
      />
      <InputField
        label="Access token"
        required
        revealer
        hint="Create a user auth token or internal integration token with event:read and project:read scopes to list issues, read issue details, and retrieve stack traces."
        value={c.accessToken ?? ''}
        onChange={(e) => set({ ...c, accessToken: e.target.value })}
      />
    </>
  )
}

function AzureFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Azure>) {
  return (
    <>
      <InputField
        label="Subscription ID"
        required
        placeholder="00000000-0000-0000-0000-000000000000"
        value={c.subscriptionId ?? ''}
        onChange={(e) => set({ ...c, subscriptionId: e.target.value })}
      />
      <InputField
        label="Tenant ID"
        required
        placeholder="00000000-0000-0000-0000-000000000000"
        value={c.tenantId ?? ''}
        onChange={(e) => set({ ...c, tenantId: e.target.value })}
      />
      <InputField
        label="Client ID"
        required
        placeholder="00000000-0000-0000-0000-000000000000"
        value={c.clientId ?? ''}
        onChange={(e) => set({ ...c, clientId: e.target.value })}
      />
      <InputField
        label="Client secret"
        required
        revealer
        value={c.clientSecret ?? ''}
        onChange={(e) => set({ ...c, clientSecret: e.target.value })}
      />
      <InputField
        label="Azure Managed Prometheus query URL (optional)"
        hint="When set, metrics tools use PromQL against this endpoint instead of Azure Monitor REST metrics. Use your workspace query URL (for example from Azure Monitor workspace settings)."
        placeholder="https://…"
        value={c.prometheusUrl ?? ''}
        onChange={(e) =>
          set({ ...c, prometheusUrl: e.target.value || undefined })
        }
      />
    </>
  )
}

function JaegerFormFields({
  config: c,
  setConfig: set,
}: ToolFormFieldProps<WorkbenchToolType.Jaeger>) {
  return (
    <>
      <InputField
        label="URL"
        required
        placeholder="http://jaeger-query.monitoring.svc:16686"
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
