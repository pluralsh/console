import pick from 'lodash/pick'
import isEqual from 'lodash/isEqual'

/**
 * Performs a deep comparison between two objects to determine if `subObject` is
 * equivalent to a subset of `object` using only the own enumerable keys of
 * `subset`. Essentially checks if shallow merging `subObject` into `object`
 * would be equivalent to `object` itself.
 *
 * @param object Object to compare against
 * @param subObject Object containing
 * @returns
 */
export function isSubsetEqual<T extends Record<string, unknown>>(
  object: T,
  subObject: Partial<T>
) {
  const partialSet = pick(object, Object.keys(subObject))

  return isEqual(partialSet, subObject)
}
