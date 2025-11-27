import { List, ListItem } from '../components/List'
import { type BaseSchema } from '../types'

export const list: BaseSchema = {
  render: List,
  children: ['item'],
  attributes: {
    ordered: { type: Boolean, render: true, required: true },
  },
}

export const item: BaseSchema = {
  render: ListItem,
  children: [
    'inline',
    'heading',
    'paragraph',
    'image',
    'table',
    'tag',
    'fence',
    'blockquote',
    'list',
    'hr',
  ],
  attributes: {},
}
