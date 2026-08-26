import { fromNow } from 'utils/datetime'

export type PolicyEvalMap = Record<string, unknown>

export function isPolicyEvalDenied(output?: PolicyEvalMap | null): boolean {
  const deny = output?.deny

  return Array.isArray(deny) && deny.length > 0
}

export function getPolicyEvalToolName(input?: PolicyEvalMap | null): string {
  const toolName = asString(input?.tool_name)

  if (toolName) return toolName

  return (
    asString(asRecord(input?.tool)?.name) ??
    asString(input?.run_type) ??
    'Evaluation'
  )
}

export function getPolicyEvalTarget(
  input?: PolicyEvalMap | null
): string | undefined {
  const tool = asRecord(input?.tool)
  const args = asRecord(tool?.arguments) ?? asRecord(input?.tool)

  return (
    asString(asRecord(input?.workbench)?.name) ??
    asString(asRecord(input?.stack)?.name) ??
    asString(asRecord(input?.cluster)?.name) ??
    asString(args?.namespace)
  )
}

export function getPolicyEvalReason(output?: PolicyEvalMap | null): string {
  const deny = output?.deny

  if (!Array.isArray(deny) || deny.length === 0) {
    return 'Allowed by policy.'
  }

  return deny
    .map((item) => {
      if (typeof item === 'string') return item

      const rec = asRecord(item)

      return (
        asString(rec?.message) ??
        asString(rec?.reason) ??
        asString(rec?.msg) ??
        JSON.stringify(item)
      )
    })
    .join('; ')
}

export function formatEvalId(id: string): string {
  return `eval ${id.replace(/-/g, '').slice(0, 4)}`
}

export function formatEvalSelectLabel(
  id: string,
  input?: PolicyEvalMap | null,
  insertedAt?: string | null
): string {
  return [
    formatEvalId(id),
    getPolicyEvalToolName(input),
    insertedAt ? fromNow(insertedAt) : undefined,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function stringifyEvalMap(value?: PolicyEvalMap | null): string {
  return JSON.stringify(value ?? {}, null, 2)
}

function asRecord(value: unknown): PolicyEvalMap | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as PolicyEvalMap
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
