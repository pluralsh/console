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
  ConfigurableWorkbenchToolType,
  isConfigurableWorkbenchToolType,
  TOOL_TYPE_TO_CATEGORIES,
} from './workbenchToolsConsts'

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
  const { state, update } = useUpdateState<WorkbenchToolFormState>({
    name: tool?.name ?? '',
    categories: tool?.categories ?? TOOL_TYPE_TO_CATEGORIES[type],
    configuration: sanitizeInitialConfiguration(tool),
  })
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
      {TOOL_TYPE_TO_CATEGORIES[type].length > 1 && (
        <FormField label="Allowed capabilities (must select at least one)">
          <Flex
            direction="column"
            gap="xsmall"
          >
            {TOOL_TYPE_TO_CATEGORIES[type].map((category) => {
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
          destructive
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          loading={mutationLoading}
          onClick={() => onSave(state)}
        >
          Save
        </Button>
      </StickyActionsFooterSC>
    </FormCardSC>
  )
}

type FragmentConfig = WorkbenchToolFragment['configuration']

/** Build initial form configuration from fragment data. Keyed by configurable tool type. */
const INITIAL_CONFIG_BY_TYPE: Record<
  ConfigurableWorkbenchToolType,
  (config: FragmentConfig) => Partial<WorkbenchToolConfigurationAttributes>
> = {
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
          (method as WorkbenchToolHttpMethod) ?? WorkbenchToolHttpMethod.Get,
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
  [WorkbenchToolType.Linear]: () => ({ linear: { accessToken: '' } }),
}

function sanitizeInitialConfiguration(
  tool: Nullable<WorkbenchToolFragment>
): WorkbenchToolConfigurationAttributes {
  const toolType = tool?.tool
  if (!toolType || !isConfigurableWorkbenchToolType(toolType)) {
    return {}
  }
  return INITIAL_CONFIG_BY_TYPE[toolType](
    tool?.configuration ?? null
  ) as WorkbenchToolConfigurationAttributes
}
