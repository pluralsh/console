import { Checkbox, Flex, FormField, Input2 } from '@pluralsh/design-system'
import { useUpdateState } from 'components/hooks/useUpdateState'
import {
  WorkbenchToolAttributes,
  WorkbenchToolConfigurationAttributes,
  WorkbenchToolFragment,
  WorkbenchToolHttpMethod,
  WorkbenchToolType,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchToolFormFields } from './WorkbenchToolFormFields'
import {
  categoryToLabel,
  TOOL_TYPE_TO_CATEGORIES,
} from './workbenchToolsConsts'

export type WorkbenchToolFormState = Pick<
  WorkbenchToolAttributes,
  'name' | 'categories' | 'configuration'
>

export function WorkbenchToolForm({
  type,
  tool,
}: {
  type: WorkbenchToolType
  tool: Nullable<WorkbenchToolFragment>
}) {
  const { state, update } = useUpdateState<WorkbenchToolFormState>({
    name: tool?.name ?? '',
    categories: tool?.categories ?? TOOL_TYPE_TO_CATEGORIES[type],
    configuration: sanitizeInitialConfiguration(tool),
  })
  return (
    <>
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
    </>
  )
}

const sanitizeInitialConfiguration = (
  tool: Nullable<WorkbenchToolFragment>
): WorkbenchToolConfigurationAttributes => {
  const { datadog, elastic, loki, prometheus, tempo, http, atlassian } =
    tool?.configuration ?? {}
  switch (tool?.tool) {
    case WorkbenchToolType.Datadog: {
      const { site } = datadog ?? {}
      return { datadog: { site: site, apiKey: '', appKey: '' } }
    }
    case WorkbenchToolType.Elastic: {
      const { index, url, username } = elastic ?? {}
      return {
        elastic: {
          index: index ?? '',
          url: url ?? '',
          username: username ?? '',
          password: '',
        },
      }
    }
    case WorkbenchToolType.Http: {
      const { url, method, body, headers, inputSchema } = http ?? {}
      return {
        http: {
          url: url ?? '',
          method:
            (method as WorkbenchToolHttpMethod) ?? WorkbenchToolHttpMethod.Get,
          body: body,
          headers: headers?.filter(isNonNullable),
          inputSchema: inputSchema,
        },
      }
    }
    case WorkbenchToolType.Loki: {
      const { url, username, tenantId } = loki ?? {}
      return { loki: { url: url ?? '', username, tenantId } }
    }
    case WorkbenchToolType.Prometheus: {
      const { url, username, tenantId } = prometheus ?? {}
      return { prometheus: { url: url ?? '', username, tenantId } }
    }
    case WorkbenchToolType.Tempo:
      const { url, username, tenantId } = tempo ?? {}
      return { tempo: { url: url ?? '', username, tenantId } }
    case WorkbenchToolType.Atlassian: {
      const { email } = atlassian ?? {}
      return { atlassian: { email: email ?? '' } }
    }
    case WorkbenchToolType.Linear:
      return { linear: { accessToken: '' } }
    default:
      return {}
  }
}
