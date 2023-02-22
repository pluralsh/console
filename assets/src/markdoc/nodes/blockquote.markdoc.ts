import Blockquote from '../../components/md/Blockquote'

export const blockquote = {
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
}
