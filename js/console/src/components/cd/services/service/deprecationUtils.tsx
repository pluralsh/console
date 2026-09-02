import { isNonNullable } from 'utils/isNonNullable'

export function countDeprecations(
  components:
    | ({ apiDeprecations?: unknown[] | null | undefined } | null | undefined)[]
    | null
    | undefined
) {
  return (
    components?.reduce(
      (count, component) => count + (component?.apiDeprecations?.length || 0),
      0
    ) ?? 0
  )
}

export function collectDeprecations<T>(
  components:
    | (
        | { apiDeprecations?: (T | null | undefined)[] | null | undefined }
        | null
        | undefined
      )[]
    | null
    | undefined
) {
  return (
    components?.reduce(
      (deprecations, component) => [
        ...deprecations,
        ...(component?.apiDeprecations?.filter(isNonNullable) || []),
      ],
      [] as T[]
    ) || []
  )
}
