import { semanticColorsDark as semanticColors } from './colors-semantic-dark'
import { blue, red } from './colors-base'

export const editorThemeDark = {
  inherit: true,
  base: 'vs-dark',
  rules: [
    {
      background: semanticColors['fill-one'],
      token: '',
    },
    {
      foreground: semanticColors['text-xlight'],
      token: 'comment',
    },
    {
      foreground: blue[300],
      token: 'string',
    },
    {
      foreground: semanticColors['code-block-light-green'],
      token: 'constant.numeric',
    },
    {
      foreground: semanticColors['code-block-dark-green'],
      token: 'constant.language',
    },
    {
      foreground: semanticColors['code-block-purple'],
      token: 'keyword',
    },
    {
      foreground: semanticColors['code-block-purple'],
      token: 'support.constant.property-value',
    },
    {
      foreground: semanticColors['code-block-purple'],
      token: 'constant.other.color',
    },
    {
      foreground: semanticColors['code-block-yellow'],
      token: 'keyword.other.unit',
    },
    {
      foreground: semanticColors['code-block-light-lilac'],
      token: 'entity.other.attribute-name.html',
    },
    {
      foreground: semanticColors['text-disabled'],
      token: 'keyword.operator',
    },
    {
      foreground: red[200],
      token: 'storage',
    },
    {
      foreground: semanticColors['code-block-dark-grey'],
      token: 'entity.other.inherited-class',
    },
    {
      foreground: semanticColors['code-block-dark-grey'],
      token: 'entity.name.tag',
    },
    {
      foreground: semanticColors['code-block-dark-lilac'],
      token: 'constant.character.entity',
    },
    {
      foreground: semanticColors['code-block-dark-lilac'],
      token: 'support.class.js',
    },
    {
      foreground: semanticColors['code-block-dark-grey'],
      token: 'entity.other.attribute-name',
    },
    {
      foreground: red[200],
      token: 'meta.selector.css',
    },
    {
      foreground: red[200],
      token: 'entity.name.tag.css',
    },
    {
      foreground: red[200],
      token: 'entity.other.attribute-name.id.css',
    },
    {
      foreground: red[200],
      token: 'entity.other.attribute-name.class.css',
    },
    {
      foreground: semanticColors['code-block-dark-grey'],
      token: 'meta.property-name.css',
    },
    {
      foreground: red[200],
      token: 'support.function',
    },
    {
      foreground: semanticColors['code-block-light-grey'],
      background: red[200],
      token: 'invalid',
    },
    {
      foreground: red[200],
      token: 'punctuation.section.embedded',
    },
    {
      foreground: semanticColors['code-block-dark-grey'],
      token: 'punctuation.definition.tag',
    },
    {
      foreground: semanticColors['code-block-dark-lilac'],
      token: 'constant.other.color.rgb-value.css',
    },
    {
      foreground: semanticColors['code-block-dark-lilac'],
      token: 'support.constant.property-value.css',
    },
  ],
  colors: {
    'editor.foreground': semanticColors['text-light'],
    'editor.errorForeground': semanticColors['text-danger-light'],
    'editor.descriptionForeground': semanticColors['text-xlight'],
    'editor.background': semanticColors['fill-one'],
    'editor.lineHighlightBackground': semanticColors['fill-one-hover'],
    'editor.selectionBackground': semanticColors['fill-one-selected'],
    'editor.inactiveSelectionBackground': semanticColors['fill-one-hover'],
    'editorCursor.foreground': semanticColors.text,
    'editorWhitespace.foreground': semanticColors['text-light'],
    'editorLineNumber.foreground': semanticColors['text-light'],
    'scrollbarSlider.background': semanticColors['fill-three'],
    'scrollbarSlider.hoverBackground': semanticColors['fill-three'],
  },
}
