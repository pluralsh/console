import { Tag, TagInput } from 'generated/graphql'
import { Key } from 'react'

export function tagToKey(tag: Pick<Tag, 'name' | 'value'>) {
  return `${tag.name}:${tag.value}`
}

export function keyToTag(key: Key): Pick<Tag, 'name' | 'value'> {
  const val = key.toString().split(':')

  return { name: val[0] ?? '', value: val[1] ?? '' }
}

export function keySetToTagArray(keys: Set<Key>): TagInput[] {
  return Array.from(keys, (key) => keyToTag(key))
}
