import { useUpdateState } from 'components/hooks/useUpdateState'
import {
  WorkbenchToolAttributes,
  WorkbenchToolConfigurationAttributes,
  WorkbenchToolFragment,
  WorkbenchToolHttpMethod,
  WorkbenchToolType,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

type WorkbenchToolFormState = Pick<
  WorkbenchToolAttributes,
  'name' | 'categories' | 'configuration'
>

export function WorkbenchToolForm({
  tool,
}: {
  tool: Nullable<WorkbenchToolFragment>
}) {
  const { state: _formState, update: _updateFormState } =
    useUpdateState<WorkbenchToolFormState>({
      name: tool?.name ?? '',
      categories: tool?.categories ?? [],
      configuration: getInitialConfiguration(tool),
    })
  return <div>WorkbenchToolForm</div>
}

const getInitialConfiguration = (
  tool: Nullable<WorkbenchToolFragment>
): WorkbenchToolConfigurationAttributes => {
  const { datadog, elastic, loki, prometheus, tempo, http } =
    tool?.configuration ?? {}
  switch (tool?.tool) {
    case WorkbenchToolType.Datadog:
      return { datadog: { site: datadog?.site ?? '', apiKey: '', appKey: '' } }
    case WorkbenchToolType.Elastic:
      return {
        elastic: {
          index: elastic?.index ?? '',
          url: elastic?.url ?? '',
          username: elastic?.username ?? '',
          password: '',
        },
      }
    case WorkbenchToolType.Http:
      return {
        http: {
          url: http?.url ?? '',
          method:
            (http?.method as WorkbenchToolHttpMethod) ??
            WorkbenchToolHttpMethod.Get,
          body: http?.body ?? undefined,
          headers: http?.headers?.filter(isNonNullable),
          inputSchema: http?.inputSchema ?? undefined,
        },
      }
    case WorkbenchToolType.Loki:
      return {
        loki: {
          url: loki?.url ?? '',
          username: loki?.username ?? undefined,
          tenantId: loki?.tenantId ?? undefined,
        },
      }
    case WorkbenchToolType.Prometheus:
      return {
        prometheus: {
          url: prometheus?.url ?? '',
          username: prometheus?.username ?? undefined,
          tenantId: prometheus?.tenantId ?? undefined,
        },
      }
    case WorkbenchToolType.Tempo:
      return {
        tempo: {
          url: tempo?.url ?? '',
          username: tempo?.username ?? undefined,
          tenantId: tempo?.tenantId ?? undefined,
        },
      }
    default:
      return {}
  }
}
