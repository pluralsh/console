import {
  type Config,
  type RenderableTreeNode,
  type Schema,
  type SchemaAttribute,
  Tag,
} from '@markdoc/markdoc'
import { type ComponentType } from 'react'

export type BaseSchema<C extends Config = Config> = Omit<
  Schema<C, ComponentType>,
  'attributes'
> & {
  description?: string
  attributes: Record<string, SchemaAttribute & { description?: string }>
}

export function isTag(n: RenderableTreeNode): n is Tag {
  return Tag.isTag(n)
}
