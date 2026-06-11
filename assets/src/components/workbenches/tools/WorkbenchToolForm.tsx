import {
  Button,
  Checkbox,
  Divider,
  Flex,
  FormField,
  Input2,
} from '@pluralsh/design-system'
import { useUpdateState } from 'components/hooks/useUpdateState'
import { FormBindings } from 'components/utils/bindings'
import {
  PolicyBindingFragment,
  Provider,
  WorkbenchToolAttributes,
  WorkbenchToolConfigurationAttributes,
  WorkbenchToolFragment,
  WorkbenchToolHttpMethod,
  WorkbenchToolType,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { useState } from 'react'
import {
  FormCardSC,
  SidebarBtnSC,
  StickyActionsFooterSC,
  WorkbenchSplitLayoutSC,
} from '../workbench/create-edit/WorkbenchCreateOrEdit'
import { CloudConnectionSelectField } from './cloud-connection/CloudConnectionSelectField'
import { McpServerSelectField } from './mcp-server/McpServerSelectField'
import { ScmConnectionWorkbenchSelect } from './scm-connection/ScmConnectionWorkbenchSelect'
import { WorkbenchToolDeleteModal } from './WorkbenchToolDeleteModal'
import { WorkbenchToolFormFields } from './WorkbenchToolFormFields'
import {
  categoryToLabel,
  ConfigForToolType,
  CONFIGURABLE_TOOL_TYPE_TO_CONFIG_KEY,
  ConfigurableWorkbenchToolType,
  getWorkbenchToolLabel,
  isConfigurableWorkbenchToolType,
  scmTypeForWorkbenchTool,
  TOOL_TYPE_TO_CATEGORIES,
} from './workbenchToolsUtils'
import { Link } from 'react-router-dom'

function githubWorkbenchAuthIsValid(
  gh: WorkbenchToolConfigurationAttributes['github'] | null | undefined,
  persistedApp: { appId?: Nullable<string>; installationId?: Nullable<string> }
): boolean {
  if (!gh) return false
  const pat = (gh.accessToken ?? '').trim()
  if (pat.length > 0) return true

  const appId = (gh.appId ?? '').trim()
  const installationId = (gh.installationId ?? '').trim()
  const privateKey = (gh.privateKey ?? '').trim()
  if (appId && installationId && privateKey) return true

  const persistedAppId = (persistedApp.appId ?? '').trim()
  const persistedInstallationId = (persistedApp.installationId ?? '').trim()
  if (
    appId &&
    installationId &&
    persistedAppId &&
    persistedInstallationId &&
    appId === persistedAppId &&
    installationId === persistedInstallationId
  ) {
    return true
  }

  return false
}

function teamsConfigurationIsComplete(
  teams: WorkbenchToolConfigurationAttributes['teams'] | null | undefined
): boolean {
  const clientId = (teams?.clientId ?? '').trim()
  const tenantId = (teams?.tenantId ?? '').trim()
  const clientSecret = (teams?.clientSecret ?? '').trim()
  return clientId.length > 0 && tenantId.length > 0 && clientSecret.length > 0
}

function pagerdutyConfigurationIsComplete(
  c: WorkbenchToolConfigurationAttributes['pagerduty'] | null | undefined
): boolean {
  return scmTokenIsSet(c?.apiToken)
}

function scmTokenIsSet(token: string | null | undefined): boolean {
  return (token ?? '').trim().length > 0
}

function sentryConfigurationIsComplete(
  c: WorkbenchToolConfigurationAttributes['sentry'] | null | undefined
): boolean {
  return scmTokenIsSet(c?.accessToken)
}

function opensearchConfigurationIsComplete(
  c: WorkbenchToolConfigurationAttributes['opensearch'] | null | undefined
): boolean {
  const hasEndpoint = (c?.host ?? '').trim().length > 0
  const hasIndex = (c?.index ?? '').trim().length > 0
  const hasStaticCredentials =
    (c?.awsAccessKeyId ?? '').trim().length > 0 &&
    (c?.awsSecretAccessKey ?? '').trim().length > 0

  return (
    hasEndpoint && hasIndex && (!!c?.usePodIdentity || hasStaticCredentials)
  )
}

function bitbucketDatacenterConfigurationIsComplete(
  c:
    | WorkbenchToolConfigurationAttributes['bitbucketDatacenter']
    | null
    | undefined
): boolean {
  return (c?.url ?? '').trim().length > 0 && scmTokenIsSet(c?.token)
}

export type WorkbenchToolFormState = Omit<
  Pick<
    WorkbenchToolAttributes,
    | 'name'
    | 'categories'
    | 'configuration'
    | 'cloudConnectionId'
    | 'mcpServerId'
    | 'scmConnectionId'
    | 'readBindings'
    | 'writeBindings'
  >,
  'readBindings' | 'writeBindings'
> & {
  readBindings: PolicyBindingFragment[]
  writeBindings: PolicyBindingFragment[]
}

type WorkbenchToolFormStep = 'configuration' | 'access-policy'

const TOOL_FORM_STEPS = [
  { key: 'configuration', label: 'Configuration' },
  { key: 'access-policy', label: 'Access policy' },
] as const

export function WorkbenchToolForm({
  type,
  provider,
  tool,
  mutationLoading,
  backPath,
  onSave,
  onToolDeleted,
}: {
  type: WorkbenchToolType
  provider: Nullable<Provider>
  tool: Nullable<WorkbenchToolFragment>
  mutationLoading: boolean
  backPath: string
  onSave: (state: WorkbenchToolFormState) => void
  onToolDeleted?: () => void
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [currentStep, setCurrentStep] =
    useState<WorkbenchToolFormStep>('configuration')
  const { state, update, hasUpdates } = useUpdateState<WorkbenchToolFormState>({
    name: tool?.name ?? '',
    categories: tool?.categories ?? TOOL_TYPE_TO_CATEGORIES[type],
    configuration: sanitizeInitialConfiguration(tool),
    cloudConnectionId: tool?.cloudConnection?.id,
    mcpServerId: tool?.mcpServer?.id,
    scmConnectionId: tool?.scmConnection?.id,
    readBindings: tool?.readBindings?.filter(isNonNullable) ?? [],
    writeBindings: tool?.writeBindings?.filter(isNonNullable) ?? [],
  })
  const categories = TOOL_TYPE_TO_CATEGORIES[type] ?? []
  const hasRegisteredScm = Boolean(state.scmConnectionId)
  const scmType = scmTypeForWorkbenchTool(type)
  const configurationStepComplete =
    !!state.name.trim() &&
    (type !== WorkbenchToolType.Cloud || !!state.cloudConnectionId) &&
    (type !== WorkbenchToolType.Mcp || !!state.mcpServerId) &&
    (type !== WorkbenchToolType.Github ||
      hasRegisteredScm ||
      githubWorkbenchAuthIsValid(state.configuration?.github, {
        appId: tool?.configuration?.github?.appId,
        installationId: tool?.configuration?.github?.installationId,
      })) &&
    (type !== WorkbenchToolType.Opensearch ||
      opensearchConfigurationIsComplete(state.configuration?.opensearch)) &&
    (type !== WorkbenchToolType.Gitlab ||
      hasRegisteredScm ||
      scmTokenIsSet(state.configuration?.gitlab?.token)) &&
    (type !== WorkbenchToolType.Bitbucket ||
      hasRegisteredScm ||
      scmTokenIsSet(state.configuration?.bitbucket?.token)) &&
    (type !== WorkbenchToolType.BitbucketDatacenter ||
      hasRegisteredScm ||
      bitbucketDatacenterConfigurationIsComplete(
        state.configuration?.bitbucketDatacenter
      )) &&
    (type !== WorkbenchToolType.AzureDevops ||
      hasRegisteredScm ||
      scmTokenIsSet(state.configuration?.azureDevops?.token)) &&
    (type !== WorkbenchToolType.Teams ||
      teamsConfigurationIsComplete(state.configuration?.teams)) &&
    (type !== WorkbenchToolType.Pagerduty ||
      !!tool?.id ||
      pagerdutyConfigurationIsComplete(state.configuration?.pagerduty)) &&
    (type !== WorkbenchToolType.Sentry ||
      !!tool?.id ||
      sentryConfigurationIsComplete(state.configuration?.sentry))
  const allowSave = hasUpdates && configurationStepComplete
  return (
    <WorkbenchSplitLayoutSC
      css={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        height: '100%',
        alignItems: 'flex-start',
      }}
    >
      <Flex
        direction="column"
        width={200}
        flexShrink={0}
        gap="xxxsmall"
      >
        {TOOL_FORM_STEPS.map(({ key, label }) => (
          <SidebarBtnSC
            key={key}
            $active={currentStep === key}
            onClick={() => setCurrentStep(key)}
          >
            {label}
          </SidebarBtnSC>
        ))}
      </Flex>
      <FormCardSC
        css={{
          flex: 'unset',
          height: 'auto',
          maxHeight: '100%',
          minHeight: 0,
          alignSelf: 'flex-start',
        }}
      >
        {currentStep === 'configuration' ? (
          <>
            <FormField
              required
              label="Name"
              value={state.name}
              onChange={(e) => update({ name: e.target.value })}
            >
              <Input2
                placeholder="Enter a name for the tool"
                value={state.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </FormField>
            {type === WorkbenchToolType.Cloud && provider ? (
              <CloudConnectionSelectField
                provider={provider}
                selectedId={state.cloudConnectionId ?? null}
                onChange={(id) => update({ cloudConnectionId: id })}
              />
            ) : type === WorkbenchToolType.Mcp ? (
              <McpServerSelectField
                selectedId={state.mcpServerId ?? null}
                onChange={(id) => update({ mcpServerId: id })}
              />
            ) : (
              <>
                {scmType ? (
                  <ScmConnectionWorkbenchSelect
                    scmType={scmType}
                    toolLabel={getWorkbenchToolLabel(type)}
                    selectedId={state.scmConnectionId ?? null}
                    onChange={(id) => update({ scmConnectionId: id })}
                  />
                ) : null}
                <WorkbenchToolFormFields
                  type={type}
                  state={state}
                  update={update}
                />
              </>
            )}
            {categories.length > 1 && (
              <FormField label="Allowed capabilities (must select at least one)">
                <Flex
                  direction="column"
                  gap="xsmall"
                >
                  {categories.map((category) => {
                    const selected = (state.categories ?? []).filter(Boolean)
                    const isChecked = selected.includes(category)
                    const canUncheck = selected.length > 1
                    return (
                      <Checkbox
                        key={category}
                        small
                        checked={isChecked}
                        onChange={(e) => {
                          const checked = e.target.checked
                          if (checked) {
                            update({
                              categories: [...selected, category].filter(
                                Boolean
                              ),
                            })
                          } else if (canUncheck) {
                            update({
                              categories: selected.filter(
                                (c) => c !== category
                              ),
                            })
                          }
                        }}
                      >
                        {categoryToLabel[category]}
                      </Checkbox>
                    )
                  })}
                </Flex>
              </FormField>
            )}
          </>
        ) : (
          <ToolAccessPolicyStep
            readBindings={state.readBindings?.filter(isNonNullable) ?? []}
            writeBindings={state.writeBindings?.filter(isNonNullable) ?? []}
            update={update}
          />
        )}
        <StickyActionsFooterSC>
          {tool?.id ? (
            <Button
              destructive
              onClick={() => setDeleteOpen(true)}
            >
              Delete tool
            </Button>
          ) : null}
          <Flex
            gap="small"
            grow={1}
            justify="end"
          >
            <Button
              secondary
              as={Link}
              to={backPath}
            >
              {hasUpdates ? 'Cancel' : 'Back'}
            </Button>
            <Button
              disabled={
                currentStep === 'configuration'
                  ? !configurationStepComplete
                  : !allowSave
              }
              loading={currentStep === 'access-policy' && mutationLoading}
              onClick={() => {
                if (currentStep === 'configuration') {
                  setCurrentStep('access-policy')
                  return
                }
                onSave(state)
              }}
            >
              {currentStep === 'configuration' ? 'Next' : 'Save'}
            </Button>
          </Flex>
        </StickyActionsFooterSC>
        <WorkbenchToolDeleteModal
          open={deleteOpen}
          tool={tool}
          onClose={() => setDeleteOpen(false)}
          onDeleted={onToolDeleted}
        />
      </FormCardSC>
    </WorkbenchSplitLayoutSC>
  )
}

function ToolAccessPolicyStep({
  readBindings,
  writeBindings,
  update,
}: {
  readBindings: PolicyBindingFragment[]
  writeBindings: PolicyBindingFragment[]
  update: (next: Partial<WorkbenchToolFormState>) => void
}) {
  return (
    <Flex
      direction="column"
      gap="large"
    >
      <Flex
        direction="column"
        gap="xsmall"
      >
        <FormField label="Read permissions">
          <FormBindings
            bindings={readBindings}
            setBindings={(next: PolicyBindingFragment[]) =>
              update({ readBindings: next })
            }
            hints={{
              user: 'Users with read permissions for this tool',
              group: 'Groups with read permissions for this tool',
            }}
          />
        </FormField>
      </Flex>
      <Divider backgroundColor="border" />
      <Flex
        direction="column"
        gap="xsmall"
      >
        <FormField label="Write permissions">
          <FormBindings
            bindings={writeBindings}
            setBindings={(next: PolicyBindingFragment[]) =>
              update({ writeBindings: next })
            }
            hints={{
              user: 'Users with write permissions for this tool',
              group: 'Groups with write permissions for this tool',
            }}
          />
        </FormField>
      </Flex>
    </Flex>
  )
}

// done this way so TS will catch new tool types that aren't fully implemented yet
/** Build initial form configuration from fragment data. Keyed by configurable tool type. */
export const INITIAL_TOOL_CONFIG_BY_TYPE: {
  [T in ConfigurableWorkbenchToolType]: (
    config: WorkbenchToolFragment['configuration']
  ) => Record<
    (typeof CONFIGURABLE_TOOL_TYPE_TO_CONFIG_KEY)[T],
    ConfigForToolType<T>
  >
} = {
  [WorkbenchToolType.Datadog]: (config) => {
    const { site } = config?.datadog ?? {}
    return { datadog: { site: site ?? undefined, apiKey: '', appKey: '' } }
  },
  [WorkbenchToolType.Elastic]: (config) => {
    const { index, url, username } = config?.elastic ?? {}
    return {
      elastic: {
        index: index ?? '',
        url: url ?? '',
        username: username ?? '',
        password: '',
      },
    }
  },
  [WorkbenchToolType.Opensearch]: (config) => {
    const {
      host,
      index,
      awsAccessKeyId,
      awsRegion,
      assumeRoleArn,
      usePodIdentity,
    } = config?.opensearch ?? {}
    return {
      opensearch: {
        host: host ?? '',
        index: index ?? '',
        awsAccessKeyId: awsAccessKeyId ?? undefined,
        awsSecretAccessKey: undefined,
        awsRegion: awsRegion ?? undefined,
        assumeRoleArn: assumeRoleArn ?? undefined,
        usePodIdentity: usePodIdentity ?? false,
      },
    }
  },
  [WorkbenchToolType.Http]: (config) => {
    const { url, method, body, headers, inputSchema } = config?.http ?? {}
    return {
      http: {
        url: url ?? '',
        method:
          (method?.toUpperCase() as WorkbenchToolHttpMethod) ??
          WorkbenchToolHttpMethod.Get,
        body: body ?? undefined,
        headers: headers?.filter(isNonNullable),
        inputSchema: inputSchema ?? undefined,
      },
    }
  },
  [WorkbenchToolType.Loki]: (config) => {
    const { url, username, tenantId } = config?.loki ?? {}
    return { loki: { url: url ?? '', username, tenantId } }
  },
  [WorkbenchToolType.Prometheus]: (config) => {
    const { url, username, tenantId, awsSigv4, awsAccessKeyId, awsRegion } =
      config?.prometheus ?? {}
    return {
      prometheus: {
        url: url ?? '',
        username,
        tenantId,
        awsSigv4: awsSigv4 ?? false,
        awsAccessKeyId: awsAccessKeyId ?? undefined,
        awsSecretAccessKey: undefined,
        awsRegion: awsRegion ?? undefined,
      },
    }
  },
  [WorkbenchToolType.Tempo]: (config) => {
    const { url, username, tenantId } = config?.tempo ?? {}
    return { tempo: { url: url ?? '', username, tenantId } }
  },
  [WorkbenchToolType.Jaeger]: (config) => {
    const { url, username } = config?.jaeger ?? {}
    return { jaeger: { url: url ?? '', username } }
  },
  [WorkbenchToolType.Atlassian]: (config) => {
    const { email } = config?.atlassian ?? {}
    return { atlassian: { email: email ?? '' } }
  },
  [WorkbenchToolType.Exa]: () => ({ exa: { apiKey: '' } }),
  [WorkbenchToolType.Github]: (config) => {
    const { url, toolset, appId, installationId } = config?.github ?? {}
    return {
      github: {
        url: url ?? '',
        accessToken: '',
        toolset: toolset ?? undefined,
        appId: appId ?? undefined,
        installationId: installationId ?? undefined,
        privateKey: undefined,
      },
    }
  },
  [WorkbenchToolType.Gitlab]: (config) => {
    const { url } = config?.gitlab ?? {}
    return { gitlab: { url: url ?? undefined, token: '' } }
  },
  [WorkbenchToolType.Bitbucket]: (config) => {
    const { url } = config?.bitbucket ?? {}
    return { bitbucket: { url: url ?? undefined, token: '' } }
  },
  [WorkbenchToolType.BitbucketDatacenter]: (config) => {
    const { url } = config?.bitbucketDatacenter ?? {}
    return { bitbucketDatacenter: { url: url ?? '', token: '' } }
  },
  [WorkbenchToolType.AzureDevops]: () => ({ azureDevops: { token: '' } }),
  [WorkbenchToolType.Splunk]: (config) => {
    const { url, username } = config?.splunk ?? {}
    return { splunk: { url: url ?? '', username } }
  },
  [WorkbenchToolType.Cloudwatch]: (config) => {
    const { region, logGroupNames, roleArn, roleSessionName } =
      config?.cloudwatch ?? {}
    return {
      cloudwatch: {
        region: region ?? '',
        logGroupNames: logGroupNames?.filter(isNonNullable),
        roleArn: roleArn ?? undefined,
        roleSessionName: roleSessionName ?? undefined,
        accessKeyId: undefined,
        secretAccessKey: undefined,
        externalId: undefined,
      },
    }
  },
  [WorkbenchToolType.Azure]: (config) => {
    const { subscriptionId, tenantId, clientId, prometheusUrl } =
      config?.azure ?? {}
    return {
      azure: {
        subscriptionId: subscriptionId ?? '',
        tenantId: tenantId ?? '',
        clientId: clientId ?? '',
        clientSecret: '',
        prometheusUrl: prometheusUrl ?? '',
      },
    }
  },
  [WorkbenchToolType.Dynatrace]: (config) => {
    const { url } = config?.dynatrace ?? {}
    return { dynatrace: { url: url ?? '', platformToken: '' } }
  },
  [WorkbenchToolType.Linear]: () => ({ linear: { accessToken: '' } }),
  [WorkbenchToolType.Slack]: () => ({ slack: { botToken: '' } }),
  [WorkbenchToolType.Pagerduty]: () => ({ pagerduty: { apiToken: '' } }),
  [WorkbenchToolType.Teams]: (config) => {
    const { clientId, tenantId } = config?.teams ?? {}
    return {
      teams: {
        clientId: clientId ?? '',
        tenantId: tenantId ?? '',
        clientSecret: '',
      },
    }
  },
  [WorkbenchToolType.Sentry]: (config) => {
    const { url } = config?.sentry ?? {}
    return { sentry: { url: url ?? undefined, accessToken: '' } }
  },
}

function sanitizeInitialConfiguration(
  tool: Nullable<WorkbenchToolFragment>
): WorkbenchToolConfigurationAttributes {
  const toolType = tool?.tool
  if (!isConfigurableWorkbenchToolType(toolType)) return {}

  return INITIAL_TOOL_CONFIG_BY_TYPE[toolType](tool?.configuration)
}
