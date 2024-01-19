import { Tag } from 'generated/graphql'

export function tagToKey(tag: Pick<Tag, 'name' | 'value'>) {
  return `${tag.name}:${tag.value}`
}

export function keyToTag(key: string): Pick<Tag, 'name' | 'value'> {
  const val = key.split(':')

  return { name: val[0] ?? '', value: val[1] ?? '' }
}
