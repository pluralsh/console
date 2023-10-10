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
