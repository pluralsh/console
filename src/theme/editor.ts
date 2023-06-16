import { semanticColorsDark as semanticColors } from './colors-semantic-dark'

export const editorTheme = {
  inherit: true,
  base: 'vs-dark',
  rules: [
    {
      background: '21242C',
      token: '',
    },
    {
      foreground: 'A1A5B0',
      token: 'comment',
    },
    {
      foreground: '66C7FF',
      token: 'string',
    },
    {
      foreground: '99F5D5',
      token: 'constant.numeric',
    },
    {
      foreground: '3CECAF',
      token: 'constant.language',
    },
    {
      foreground: '969AF8',
      token: 'keyword',
    },
    {
      foreground: '969AF8',
      token: 'support.constant.property-value',
    },
    {
      foreground: '969AF8',
      token: 'constant.other.color',
    },
    {
      foreground: 'FFF9C2',
      token: 'keyword.other.unit',
    },
    {
      foreground: 'D596F4',
      token: 'entity.other.attribute-name.html',
    },
    {
      foreground: '454954',
      token: 'keyword.operator',
    },
    {
      foreground: 'F599A8',
      token: 'storage',
    },
    {
      foreground: '747B8B',
      token: 'entity.other.inherited-class',
    },
    {
      foreground: '747B8B',
      token: 'entity.name.tag',
    },
    {
      foreground: 'BE5EEB',
      token: 'constant.character.entity',
    },
    {
      foreground: 'BE5EEB',
      token: 'support.class.js',
    },
    {
      foreground: '747B8B',
      token: 'entity.other.attribute-name',
    },
    {
      foreground: 'F599A8',
      token: 'meta.selector.css',
    },
    {
      foreground: 'F599A8',
      token: 'entity.name.tag.css',
    },
    {
      foreground: 'F599A8',
      token: 'entity.other.attribute-name.id.css',
    },
    {
      foreground: 'F599A8',
      token: 'entity.other.attribute-name.class.css',
    },
    {
      foreground: '747B8B',
      token: 'meta.property-name.css',
    },
    {
      foreground: 'F599A8',
      token: 'support.function',
    },
    {
      foreground: 'EBEFF0',
      background: 'F599A8',
      token: 'invalid',
    },
    {
      foreground: 'F599A8',
      token: 'punctuation.section.embedded',
    },
    {
      foreground: '747B8B',
      token: 'punctuation.definition.tag',
    },
    {
      foreground: 'BE5EEB',
      token: 'constant.other.color.rgb-value.css',
    },
    {
      foreground: 'BE5EEB',
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
