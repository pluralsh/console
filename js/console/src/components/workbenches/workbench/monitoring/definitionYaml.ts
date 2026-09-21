import { dump } from 'js-yaml'
import {
  MonitorType,
  WorkbenchDashboardDetailsFragment,
  WorkbenchJobModesFieldsFragment,
  WorkbenchMonitorDetailsFragment,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

const YAML_DUMP_OPTS = { lineWidth: -1, noRefs: true, sortKeys: false } as const

const COMMENT = '# managed by workbench - edits arrive as workbench jobs\n'

/** Mirrors workbench_dashboard tool / Dashboard schema fields agents upsert. */
export function dashboardDefinitionYaml(
  dashboard: WorkbenchDashboardDetailsFragment
) {
  const graphs = dashboard.graphs?.filter(isNonNullable) ?? []
  const inputs = dashboard.inputs?.filter(isNonNullable) ?? []

  const doc = omitEmpty({
    name: dashboard.name,
    description: dashboard.description,
    inputs: inputs.length
      ? inputs.map((input) =>
          omitEmpty({
            name: input.name,
            label: input.label,
            description: input.description,
            type: enumValue(input.type),
            default: input.default,
            options: input.options?.filter(isNonNullable),
            required: input.required,
            datasource: datasourceYaml(input.datasource),
          })
        )
      : undefined,
    graphs: graphs.map((graph) =>
      omitEmpty({
        identifier: graph.identifier,
        title: graph.title,
        description: graph.description,
        type: enumValue(graph.type),
        markdown: graph.markdown,
        options: sanitizeJson(graph.options),
        layout: {
          x: graph.layout.x,
          y: graph.layout.y,
          w: graph.layout.w,
          h: graph.layout.h,
        },
        datasource: datasourceYaml(graph.datasource),
      })
    ),
  })

  return COMMENT + dump(doc, YAML_DUMP_OPTS).trimEnd()
}

/** Mirrors workbench_monitor_upsert attributes (snake_case). */
export function monitorDefinitionYaml(
  monitor: WorkbenchMonitorDetailsFragment
) {
  const isMetrics = monitor.type === MonitorType.Metrics
  const log = monitor.query?.log
  const metrics = monitor.query?.metrics

  const doc = omitEmpty({
    name: monitor.name,
    description: monitor.description,
    alert_template: monitor.alertTemplate,
    severity: enumValue(monitor.severity),
    type: enumValue(monitor.type),
    evaluation_cron: monitor.evaluationCron,
    service_id: monitor.service?.id,
    prompt: monitor.prompt,
    modes: modesYaml(monitor.modes),
    threshold: monitor.threshold
      ? {
          aggregate: enumValue(monitor.threshold.aggregate),
          value: monitor.threshold.value,
        }
      : undefined,
    query: isMetrics
      ? omitEmpty({
          metrics: omitEmpty({
            tool: metrics?.tool,
            query: metrics?.query,
            step: metrics?.step,
            duration: metrics?.duration,
            options: metricsAzureOptions(metrics?.options),
          }),
        })
      : omitEmpty({
          log: omitEmpty({
            tool: log?.tool,
            query: log?.query,
            bucket_size: log?.bucketSize,
            duration: log?.duration,
            operator: log?.operator ? enumValue(log.operator) : undefined,
            facets: log?.facets
              ?.filter(isNonNullable)
              .map((f) => ({ key: f.key, value: f.value })),
            options: logAzureOptions(log?.options),
          }),
        }),
  })

  return COMMENT + dump(doc, YAML_DUMP_OPTS).trimEnd()
}

function datasourceYaml(
  datasource: Nullable<{
    type: string
    tool: string
    input: unknown
  }>
) {
  if (!datasource) return undefined
  return omitEmpty({
    type: enumValue(datasource.type),
    tool: datasource.tool,
    input: sanitizeJson(datasource.input),
  })
}

function modesYaml(modes: Nullable<WorkbenchJobModesFieldsFragment>) {
  if (!modes) return undefined
  return omitEmpty({
    plan: modes.plan,
    verification: modes.verification,
    model: modes.model
      ? omitEmpty({
          provider: enumValue(modes.model.provider),
          model: modes.model.model,
        })
      : undefined,
    coding: modes.coding
      ? omitEmpty({
          babysit: modes.coding.babysit,
          approval: modes.coding.approval,
          review: modes.coding.review,
        })
      : undefined,
    budget: modes.budget
      ? omitEmpty({
          cost: modes.budget.cost,
          tokens: modes.budget.tokens,
        })
      : undefined,
    kubernetes: modes.kubernetes
      ? omitEmpty({
          update: modes.kubernetes.update,
          delete: modes.kubernetes.delete,
          exec: modes.kubernetes.exec,
          drain: modes.kubernetes.drain,
          exclude_namespaces:
            modes.kubernetes.excludeNamespaces?.filter(isNonNullable),
          require_namespaces:
            modes.kubernetes.requireNamespaces?.filter(isNonNullable),
        })
      : undefined,
  })
}

function logAzureOptions(
  options: Nullable<{ azure?: Nullable<{ resourceId?: string | null }> }>
) {
  const resourceId = options?.azure?.resourceId
  if (!resourceId) return undefined
  return { azure: { resource_id: resourceId } }
}

function metricsAzureOptions(
  options: Nullable<{
    azure?: Nullable<{
      resourceId?: string | null
      metricsNamespace?: string | null
      aggregation?: string | null
      filter?: string | null
      orderBy?: string | null
      rollUpBy?: string | null
      metricsEndpoint?: string | null
    }>
  }>
) {
  const azure = options?.azure
  if (!azure) return undefined
  const mapped = omitEmpty({
    resource_id: azure.resourceId,
    metrics_namespace: azure.metricsNamespace,
    aggregation: azure.aggregation,
    filter: azure.filter,
    order_by: azure.orderBy,
    roll_up_by: azure.rollUpBy,
    metrics_endpoint: azure.metricsEndpoint,
  })
  if (Object.keys(mapped).length === 0) return undefined
  return { azure: mapped }
}

function enumValue(value: unknown) {
  if (typeof value !== 'string') return value
  return value.toLowerCase()
}

function sanitizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeJson)
  if (!isPlainObject(value)) return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== '__typename')
      .map(([key, v]) => [key, sanitizeJson(v)])
  )
}

function omitEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => {
      if (v == null) return false
      if (Array.isArray(v) && v.length === 0) return false
      if (isPlainObject(v) && Object.keys(v).length === 0) return false
      return true
    })
  ) as Partial<T>
}

// Local guard (lodash's isPlainObject doesn't narrow types).
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
