import { dump } from 'js-yaml'
import {
  MonitorType,
  WorkbenchDashboardDetailsFragment,
  WorkbenchMonitorDetailsFragment,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

const YAML_DUMP_OPTS = { lineWidth: -1, noRefs: true, sortKeys: false } as const

const COMMENT = '# managed by workbench - edits arrive as workbench jobs\n'

export function monitoringDefinitionFilename(
  kind: 'dashboard' | 'monitor',
  name: string
) {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  return `${kind === 'dashboard' ? 'dashboards' : 'monitors'}/${slug}.yml`
}

export function dashboardDefinitionYaml(
  dashboard: WorkbenchDashboardDetailsFragment
) {
  const graphs = dashboard.graphs?.filter(isNonNullable) ?? []
  const inputs = dashboard.inputs?.filter(isNonNullable) ?? []

  const doc = {
    apiVersion: 'monitoring.plural.sh/v1',
    kind: 'Dashboard',
    metadata: omitEmpty({
      name: dashboard.name,
      description: dashboard.description,
    }),
    spec: omitEmpty({
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
      panels: graphs.map((graph) =>
        omitEmpty({
          identifier: graph.identifier,
          title: graph.title,
          description: graph.description,
          type: enumValue(graph.type),
          markdown: graph.markdown,
          options: graph.options,
          layout: graph.layout
            ? {
                x: graph.layout.x,
                y: graph.layout.y,
                w: graph.layout.w,
                h: graph.layout.h,
              }
            : undefined,
          datasource: datasourceYaml(graph.datasource),
        })
      ),
    }),
  }

  return COMMENT + dump(doc, YAML_DUMP_OPTS).trimEnd()
}

export function monitorDefinitionYaml(
  monitor: WorkbenchMonitorDetailsFragment
) {
  const isMetrics = monitor.type === MonitorType.Metrics
  const log = monitor.query?.log
  const metrics = monitor.query?.metrics

  const doc = {
    apiVersion: 'monitoring.plural.sh/v1',
    kind: 'Monitor',
    metadata: omitEmpty({
      name: monitor.name,
      description: monitor.description,
    }),
    spec: omitEmpty({
      type: enumValue(monitor.type),
      severity: enumValue(monitor.severity),
      state: enumValue(monitor.state),
      evaluationCron: monitor.evaluationCron,
      alertTemplate: monitor.alertTemplate,
      prompt: monitor.prompt,
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
              options: metrics?.options,
            }),
          })
        : omitEmpty({
            log: omitEmpty({
              tool: log?.tool,
              query: log?.query,
              duration: log?.duration,
              bucketSize: log?.bucketSize,
              operator: log?.operator ? enumValue(log.operator) : undefined,
              facets: log?.facets
                ?.filter(isNonNullable)
                .map((f) => ({ key: f.key, value: f.value })),
              options: log?.options,
            }),
          }),
    }),
  }

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
    input: datasource.input,
  })
}

function enumValue(value: unknown) {
  if (typeof value !== 'string') return value
  return value.toLowerCase()
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
