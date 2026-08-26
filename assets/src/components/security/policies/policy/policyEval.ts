import { compact, find, get, isArray, isPlainObject, isString } from 'lodash'
import { fromNow } from 'utils/datetime'

export type PolicyEvalMap = Record<string, unknown>

export function isPolicyEvalDenied(output?: PolicyEvalMap | null): boolean {
  const deny = get(asEvalMap(output), 'deny')

  return isArray(deny) && deny.length > 0
}

export function getPolicyEvalToolName(input?: PolicyEvalMap | null): string {
  const rec = asEvalMap(input)
  const tool = rec?.tool

  return (
    find([
      asString(rec?.tool_name),
      asString(get(tool, 'name')),
      asString(tool),
      asString(rec?.run_type),
      getPolicyEvalTarget(rec),
    ]) ?? 'Evaluation'
  )
}

export function getPolicyEvalTarget(
  input?: PolicyEvalMap | null
): string | undefined {
  const rec = asEvalMap(input)
  const tool = asRecord(rec?.tool)
  const args = asRecord(get(tool, 'arguments')) ?? tool

  return find([
    asString(get(rec, 'workbench.name')),
    asString(get(rec, 'stack.name')),
    asString(get(rec, 'cluster.name')),
    asString(get(args, 'namespace')),
  ])
}

export function getPolicyEvalReason(output?: PolicyEvalMap | null): string {
  const deny = get(asEvalMap(output), 'deny')

  if (!isArray(deny) || deny.length === 0) {
    return 'Allowed by policy.'
  }

  return deny
    .map((item) => {
      if (isString(item)) return item

      return (
        find([
          asString(get(item, 'message')),
          asString(get(item, 'reason')),
          asString(get(item, 'msg')),
        ]) ?? JSON.stringify(item)
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
  return compact([
    formatEvalId(id),
    getPolicyEvalToolName(input),
    insertedAt ? fromNow(insertedAt) : undefined,
  ]).join(' · ')
}

export function stringifyEvalMap(value?: PolicyEvalMap | null): string {
  return JSON.stringify(asEvalMap(value) ?? {}, null, 2)
}

function asEvalMap(value?: unknown): PolicyEvalMap | undefined {
  if (isString(value)) {
    try {
      return asRecord(JSON.parse(value))
    } catch {
      return undefined
    }
  }

  return asRecord(value)
}

function asRecord(value: unknown): PolicyEvalMap | undefined {
  return isPlainObject(value) ? (value as PolicyEvalMap) : undefined
}

function asString(value: unknown): string | undefined {
  return isString(value) && value.length > 0 ? value : undefined
}
