import { AlertFragment } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

// String-valued annotations, in their original order.
export function getAlertAnnotations(
  alert: Pick<AlertFragment, 'annotations'>
): [string, string][] {
  return Object.entries(alert.annotations ?? {}).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string'
  )
}

export function getAlertTags(alert: Pick<AlertFragment, 'tags'>) {
  return (alert.tags ?? []).filter(isNonNullable)
}

// Tags as [name, value] pairs, like `getAlertAnnotations`.
export function getAlertTagEntries(
  alert: Pick<AlertFragment, 'tags'>
): [string, string][] {
  return getAlertTags(alert).map(({ name, value }) => [name, value])
}
