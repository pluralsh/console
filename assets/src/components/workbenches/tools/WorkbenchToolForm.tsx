import {
  Button,
  Checkbox,
  Flex,
  FormField,
  Input2,
} from '@pluralsh/design-system'
import { useUpdateState } from 'components/hooks/useUpdateState'
import {
  WorkbenchToolAttributes,
  WorkbenchToolConfigurationAttributes,
  WorkbenchToolFragment,
  WorkbenchToolHttpMethod,
  WorkbenchToolType,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import {
  FormCardSC,
  StickyActionsFooterSC,
} from '../workbench/create-edit/WorkbenchCreateOrEdit'
import { WorkbenchToolFormFields } from './WorkbenchToolFormFields'
import {
  categoryToLabel,
  ConfigForToolType,
  CONFIGURABLE_TOOL_TYPE_TO_CONFIG_KEY,
  ConfigurableWorkbenchToolType,
  isConfigurableWorkbenchToolType,
  TOOL_TYPE_TO_CATEGORIES,
} from './workbenchToolsUtils'

export type WorkbenchToolFormState = Pick<
  WorkbenchToolAttributes,
  'name' | 'categories' | 'configuration'
>

export function WorkbenchToolForm({
  type,
  tool,
  mutationLoading,
  onCancel,
  onSave,
}: {
  type: WorkbenchToolType
  tool: Nullable<WorkbenchToolFragment>
  mutationLoading: boolean
  onCancel: () => void
  onSave: (state: WorkbenchToolFormState) => void
}) {
  const { state, update, hasUpdates } = useUpdateState<WorkbenchToolFormState>({
    name: tool?.name ?? '',
    categories: tool?.categories ?? TOOL_TYPE_TO_CATEGORIES[type],
    configuration: sanitizeInitialConfiguration(tool),
  })
  const categories = TOOL_TYPE_TO_CATEGORIES[type] ?? []
  return (
    <FormCardSC>
      <FormField
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
      <WorkbenchToolFormFields
        type={type}
        state={state}
        update={update}
      />
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
      <StickyActionsFooterSC>
        <Button
          secondary
          destructive={!!hasUpdates}
          onClick={onCancel}
        >
          {hasUpdates ? 'Cancel' : 'Back'}
        </Button>
        <Button
          disabled={!hasUpdates}
          loading={mutationLoading}
          onClick={() => onSave(state)}
        >
          Save
        </Button>
      </StickyActionsFooterSC>
    </FormCardSC>
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
  [WorkbenchToolType.Atlassian]: (config) => {
    const { email } = config?.atlassian ?? {}
    return { atlassian: { email: email ?? '' } }
  },
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
