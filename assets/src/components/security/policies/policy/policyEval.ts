import { fromNow } from 'utils/datetime'

export type PolicyEvalMap = Record<string, unknown>

export function isPolicyEvalDenied(output?: PolicyEvalMap | null): boolean {
  const deny = asEvalMap(output)?.deny

  return Array.isArray(deny) && deny.length > 0
}

export function getPolicyEvalToolName(input?: PolicyEvalMap | null): string {
  const rec = asEvalMap(input)
  const tool = rec?.tool

  return (
    asString(rec?.tool_name) ??
    asString(asRecord(tool)?.name) ??
    asString(tool) ??
    asString(rec?.run_type) ??
    getPolicyEvalTarget(input) ??
    'Evaluation'
  )
}

export function getPolicyEvalTarget(
  input?: PolicyEvalMap | null
): string | undefined {
  const rec = asEvalMap(input)
  const tool = asRecord(rec?.tool)
  const args = asRecord(tool?.arguments) ?? tool

  return (
    asString(asRecord(rec?.workbench)?.name) ??
    asString(asRecord(rec?.stack)?.name) ??
    asString(asRecord(rec?.cluster)?.name) ??
    asString(args?.namespace)
  )
}

export function getPolicyEvalReason(output?: PolicyEvalMap | null): string {
  const deny = asEvalMap(output)?.deny

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
  return JSON.stringify(asEvalMap(value) ?? {}, null, 2)
}

function asEvalMap(value?: unknown): PolicyEvalMap | undefined {
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value))
    } catch {
      return undefined
    }
  }

  return asRecord(value)
}

function asRecord(value: unknown): PolicyEvalMap | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as PolicyEvalMap
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
