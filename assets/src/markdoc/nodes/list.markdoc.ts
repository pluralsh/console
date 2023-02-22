import { List, ListItem } from '../../components/md/List'

export const list = {
  render: List,
  children: ['item'],
  attributes: {
    ordered: { type: Boolean, render: true, required: true },
  },
}

export const item = {
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
}
