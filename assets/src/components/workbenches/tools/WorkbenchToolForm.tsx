import {
  Button,
  Checkbox,
  Divider,
  Flex,
  FormField,
  GearTrainIcon,
  Input2,
  ShieldOutlineIcon,
  Stepper,
  StepperSteps,
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
  StickyActionsFooterSC,
} from '../workbench/create-edit/WorkbenchCreateOrEdit'
import { CloudConnectionSelectField } from './cloud-connection/CloudConnectionSelectField'
import { WorkbenchToolDeleteModal } from './WorkbenchToolDeleteModal'
import { WorkbenchToolFormFields } from './WorkbenchToolFormFields'
import {
  categoryToLabel,
  ConfigForToolType,
  CONFIGURABLE_TOOL_TYPE_TO_CONFIG_KEY,
  ConfigurableWorkbenchToolType,
  isConfigurableWorkbenchToolType,
  TOOL_TYPE_TO_CATEGORIES,
} from './workbenchToolsUtils'
import { Link } from 'react-router-dom'

export type WorkbenchToolFormState = Omit<
  Pick<
    WorkbenchToolAttributes,
    | 'name'
    | 'categories'
    | 'configuration'
    | 'cloudConnectionId'
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
  {
    key: 'configuration',
    stepTitle: 'Configuration',
    IconComponent: GearTrainIcon,
  },
  {
    key: 'access-policy',
    stepTitle: 'Access policy',
    IconComponent: ShieldOutlineIcon,
  },
] as const satisfies StepperSteps

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
    readBindings: tool?.readBindings?.filter(isNonNullable) ?? [],
    writeBindings: tool?.writeBindings?.filter(isNonNullable) ?? [],
  })
  const stepIndex = TOOL_FORM_STEPS.findIndex((s) => s.key === currentStep)
  const categories = TOOL_TYPE_TO_CATEGORIES[type] ?? []
  const allowSave =
    hasUpdates &&
    !!state.name.trim() &&
    (type !== WorkbenchToolType.Cloud || !!state.cloudConnectionId)
  return (
    <FormCardSC>
      <Flex css={{ paddingTop: 2 }}>
        <Stepper
          compact
          steps={TOOL_FORM_STEPS}
          stepIndex={stepIndex}
        />
      </Flex>
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
          ) : (
            <WorkbenchToolFormFields
              type={type}
              state={state}
              update={update}
            />
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
                            categories: [...selected, category].filter(Boolean),
                          })
                        } else if (canUncheck) {
                          update({
                            categories: selected.filter((c) => c !== category),
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
            disabled={currentStep === 'configuration' ? false : !allowSave}
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
    const { url, username, tenantId } = config?.prometheus ?? {}
    return { prometheus: { url: url ?? '', username, tenantId } }
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
    const { subscriptionId, tenantId, clientId } = config?.azure ?? {}
    return {
      azure: {
        subscriptionId: subscriptionId ?? '',
        tenantId: tenantId ?? '',
        clientId: clientId ?? '',
        clientSecret: '',
      },
    }
  },
  [WorkbenchToolType.Dynatrace]: (config) => {
    const { url } = config?.dynatrace ?? {}
    return { dynatrace: { url: url ?? '', platformToken: '' } }
  },
  [WorkbenchToolType.Linear]: () => ({ linear: { accessToken: '' } }),
}

function sanitizeInitialConfiguration(
  tool: Nullable<WorkbenchToolFragment>
): WorkbenchToolConfigurationAttributes {
  const toolType = tool?.tool
  if (!isConfigurableWorkbenchToolType(toolType)) return {}

  return INITIAL_TOOL_CONFIG_BY_TYPE[toolType](tool?.configuration)
}
