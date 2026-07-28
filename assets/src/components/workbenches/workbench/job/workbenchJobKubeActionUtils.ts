import { dump } from 'js-yaml'

export type KubeActionVariant = 'update' | 'delete' | 'other'

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
    case 'post':
      return 'update'
    default:
      return 'other'
  }
}

export function parseKubePath(
  path: string | null | undefined
): ParsedKubePath | null {
  if (!path?.trim()) return null
  const segments = path.split('/').filter(Boolean)
  const nsIdx = segments.indexOf('namespaces')
  if (nsIdx >= 0) {
    return {
      namespace: segments[nsIdx + 1],
      resource: segments[nsIdx + 2],
      name: segments[nsIdx + 3],
    }
  }
  if (segments.length >= 2) {
    return {
      resource: segments.at(-2),
      name: segments.at(-1),
    }
  }
  return null
}

export function formatKubeKindLabel(
  resource: string | undefined
): string | undefined {
  if (!resource) return undefined
  return resource
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

export function getKubeActionTitle(kube: KubeRequestLike | null | undefined) {
  const variant = getKubeActionVariant(kube?.method)
  const parsed = parseKubePath(kube?.path)
  const kind = formatKubeKindLabel(parsed?.resource)

  if (variant === 'delete' && kind && parsed?.name) {
    return `${kind}/${parsed.name}`
  }
  if (kind) return kind
  return kube?.method?.toUpperCase() || 'Kubernetes action'
}

export function getKubeActionSubtitle(
  kube: KubeRequestLike | null | undefined
) {
  const variant = getKubeActionVariant(kube?.method)
  const parsed = parseKubePath(kube?.path)
  const nsLabel = parsed?.namespace ? `ns/${parsed.namespace}` : null

  if (variant === 'delete') {
    return (
      [nsLabel, kube?.handle].filter(Boolean).join(' · ') ||
      kube?.handle ||
      'Kubernetes'
    )
  }

  if (variant === 'update') {
    const resourcePath =
      parsed?.resource && parsed?.name
        ? `${parsed.resource}/${parsed.name}`
        : parsed?.resource
    return (
      [nsLabel, resourcePath].filter(Boolean).join(' · ') ||
      kube?.handle ||
      'Kubernetes'
    )
  }

  const path = kube?.path?.trim()
  if (!path) return kube?.handle || 'Kubernetes'
  return [kube?.handle, path].filter(Boolean).join(' · ')
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
    return body
  }
}

export function toKubeYaml(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    try {
      return dump(sanitizeForDiff(JSON.parse(trimmed)), {
        lineWidth: -1,
        noRefs: true,
      }).trimEnd()
    } catch {
      return trimmed
    }
  }
  try {
    return dump(sanitizeForDiff(value), {
      lineWidth: -1,
      noRefs: true,
    }).trimEnd()
  } catch {
    return String(value)
  }
}

export function getKubeUpdateDiffValues(
  kube: KubeRequestLike | null | undefined
): { oldValue: string; newValue: string } {
  const proposed = parseKubeBody(kube?.body)
  const newValue = toKubeYaml(proposed ?? kube?.body)
  const oldValue = toKubeYaml(kube?.current)
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
  const parsed = parseKubePath(kube?.path)
  const nsLabel = parsed?.namespace ? `ns/${parsed.namespace}` : null
  const name = parsed?.name
  return [nsLabel, name].filter(Boolean).join(' · ') || kube?.path || 'resource'
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
