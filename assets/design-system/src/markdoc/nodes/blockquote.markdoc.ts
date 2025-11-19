import { Blockquote } from '../components/Blockquote'
import { type BaseSchema } from '../types'

export const blockquote: BaseSchema = {
  render: Blockquote,
  children: [
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
