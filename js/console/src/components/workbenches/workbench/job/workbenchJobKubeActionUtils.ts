import { dump, load } from 'js-yaml'
import { startCase } from 'lodash'
import pluralize from 'pluralize'

export type KubeActionVariant = 'create' | 'update' | 'delete' | 'other'

const YAML_DUMP_OPTS = { lineWidth: -1, noRefs: true } as const

export type ParsedKubePath = {
  namespace?: string
  resource?: string
  name?: string
}

export type KubeRequestLike = {
  handle?: string | null
  method?: string | null
  path?: string | null
  body?: string | null
  contentType?: string | null
  current?: unknown
}

export function getKubeActionVariant(
  method: string | null | undefined
): KubeActionVariant {
  switch (method?.toLowerCase()) {
    case 'delete':
      return 'delete'
    case 'put':
    case 'patch':
      return 'update'
    case 'post':
      return 'create'
    default:
      return 'other'
  }
}

export function parseKubePath(
  path: string | null | undefined
): ParsedKubePath | null {
  if (!path?.trim()) return null
  const segments = path.split('/').filter(Boolean)
  const resourceSegments =
    segments[0] === 'api'
      ? segments.slice(2)
      : segments[0] === 'apis'
        ? segments.slice(3)
        : segments

  if (resourceSegments[0] === 'namespaces' && resourceSegments.length >= 3) {
    return {
      namespace: resourceSegments[1],
      resource: resourceSegments[2],
      name: resourceSegments[3],
    }
  }

  if (resourceSegments.length >= 1) {
    return {
      resource: resourceSegments[0],
      name: resourceSegments[1],
    }
  }
  return null
}

/** Readable singular labels for Kubernetes API resource plurals. */
const KUBE_RESOURCE_LABELS: Record<string, string> = {
  pods: 'Pod',
  services: 'Service',
  secrets: 'Secret',
  namespaces: 'Namespace',
  nodes: 'Node',
  events: 'Event',
  endpoints: 'Endpoint',
  ingresses: 'Ingress',
  jobs: 'Job',
  deployments: 'Deployment',
  configmaps: 'Config map',
  serviceaccounts: 'Service account',
  persistentvolumes: 'Persistent volume',
  persistentvolumeclaims: 'Persistent volume claim',
  networkpolicies: 'Network policy',
  poddisruptionbudgets: 'Pod disruption budget',
  roles: 'Role',
  rolebindings: 'Role binding',
  clusterroles: 'Cluster role',
  clusterrolebindings: 'Cluster role binding',
  storageclasses: 'Storage class',
  ingressclasses: 'Ingress class',
  priorityclasses: 'Priority class',
  replicasets: 'Replica set',
  statefulsets: 'Stateful set',
  daemonsets: 'Daemon set',
  cronjobs: 'Cron job',
  horizontalpodautoscalers: 'Horizontal pod autoscaler',
  customresourcedefinitions: 'Custom resource definition',
}

export function formatKubeKindLabel(
  resource: string | undefined
): string | undefined {
  if (!resource) return undefined
  const key = resource.toLowerCase()
  return KUBE_RESOURCE_LABELS[key] ?? startCase(pluralize.singular(key))
}

export function getKubeActionTitle(kube: KubeRequestLike | null | undefined) {
  const kind = formatKubeKindLabel(parseKubePath(kube?.path)?.resource)
  if (kind) return kind
  return kube?.method?.toUpperCase() || 'Kubernetes action'
}

function getKubeResourceLocationLabel(
  kube: KubeRequestLike | null | undefined,
  fallback: string,
  includeHandle = false
): string {
  const parsed = parseKubePath(kube?.path)
  return (
    [
      includeHandle && kube?.handle?.trim(),
      parsed?.namespace && `ns/${parsed.namespace}`,
      parsed?.name,
    ]
      .filter(Boolean)
      .join(' · ') ||
    kube?.path?.trim() ||
    fallback
  )
}

export function getKubeActionSubtitle(
  kube: KubeRequestLike | null | undefined
) {
  return getKubeResourceLocationLabel(kube, 'Kubernetes', true)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function sanitizeForDiff(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const record = { ...(value as Record<string, unknown>) }
  delete record.status
  if (record.metadata && typeof record.metadata === 'object') {
    const metadata = { ...(record.metadata as Record<string, unknown>) }
    delete metadata.managedFields
    delete metadata.resourceVersion
    delete metadata.uid
    delete metadata.generation
    delete metadata.creationTimestamp
    record.metadata = metadata
  }
  return record
}

function parseKubeBody(body: string | null | undefined): unknown {
  if (!body?.trim()) return null
  try {
    return JSON.parse(body)
  } catch {
    try {
      return load(body)
    } catch {
      return body
    }
  }
}

export function isServerSideApplyKubeRequest(
  kube: KubeRequestLike | null | undefined
): boolean {
  const contentType = kube?.contentType?.toLowerCase().split(';')[0]?.trim()
  return (
    kube?.method?.toLowerCase() === 'patch' &&
    (contentType === 'application/apply-patch+yaml' ||
      contentType === 'application/apply-patch+json')
  )
}

function filterSourceToShape(source: unknown, shape: unknown): unknown {
  if (!isPlainObject(shape)) return source
  if (!isPlainObject(source)) return source == null ? {} : source

  return Object.fromEntries(
    Object.keys(shape)
      .filter((key) => Object.prototype.hasOwnProperty.call(source, key))
      .map((key) => [key, filterSourceToShape(source[key], shape[key])])
  )
}

export function toKubeYaml(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    try {
      return dump(
        sanitizeForDiff(JSON.parse(trimmed)),
        YAML_DUMP_OPTS
      ).trimEnd()
    } catch {
      return trimmed
    }
  }
  try {
    return dump(sanitizeForDiff(value), YAML_DUMP_OPTS).trimEnd()
  } catch {
    return String(value)
  }
}

export function getKubeUpdateDiffValues(
  kube: KubeRequestLike | null | undefined
): { oldValue: string; newValue: string } {
  const proposed = parseKubeBody(kube?.body)
  const proposedForDiff = sanitizeForDiff(proposed ?? kube?.body)
  const currentForDiff = sanitizeForDiff(kube?.current)
  const oldValue = toKubeYaml(
    isServerSideApplyKubeRequest(kube)
      ? filterSourceToShape(currentForDiff, proposedForDiff)
      : currentForDiff
  )
  const newValue = toKubeYaml(proposedForDiff)
  return { oldValue, newValue }
}

/** Full-file delete treatment: entire current object as removals. */
export function getKubeDeleteDiffValues(
  kube: KubeRequestLike | null | undefined
): { oldValue: string; newValue: string } {
  return {
    oldValue: toKubeYaml(kube?.current),
    newValue: '',
  }
}

export function getKubeDeleteResourceLabel(
  kube: KubeRequestLike | null | undefined
): string {
  return getKubeResourceLocationLabel(kube, 'resource')
}

export function getKubeDeleteWarning(
  kube: KubeRequestLike | null | undefined
): string {
  return `This permanently deletes ${getKubeDeleteResourceLabel(kube)} below. This can't be undone from the workbench.`
}

export function isKubeSecretPath(path: string | null | undefined): boolean {
  if (!path) return false
  return path.includes('/secrets/') || path.endsWith('/secrets')
}

export function isKubeSecretBody(body: string | null | undefined): boolean {
  if (!body?.trim()) return false
  try {
    const parsed = JSON.parse(body) as {
      kind?: string
      items?: Array<{ kind?: string }>
    }
    if (parsed.kind === 'Secret' || parsed.kind === 'SecretList') return true
    return parsed.items?.[0]?.kind === 'Secret'
  } catch {
    return false
  }
}

export function isKubeSecretRequest(
  kube: KubeRequestLike | null | undefined
): boolean {
  return isKubeSecretPath(kube?.path) || isKubeSecretBody(kube?.body)
}
