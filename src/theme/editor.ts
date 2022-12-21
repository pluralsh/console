import { semanticColors } from './colors'

export const editorTheme = {
  inherit: true,
  base: 'vs-dark',
  rules: [
    {
      foreground: '#FFF9C2',
      token: 'entity.name.function',
    },
    {
      foreground: '#FFF9C2',
      token: 'support.function',
    },
    {
      foreground: '#FFF9C2',
      token: 'support.constant.handlebars',
    },
    {
      foreground: '#FFF9C2',
      token: 'source.powershell variable.other.member',
    },
    {
      foreground: '#FFF9C2',
      token: 'entity.name.operator.custom-literal',
    },
    {
      foreground: '#99F5D5',
      token: 'meta.return-type',
    },
    {
      foreground: '#99F5D5',
      token: 'support.class',
    },
    {
      foreground: '#99F5D5',
      token: 'support.type',
    },
    {
      foreground: '#99F5D5',
      token: 'entity.name.type',
    },
    {
      foreground: '#99F5D5',
      token: 'entity.name.namespace',
    },
    {
      foreground: '#99F5D5',
      token: 'entity.other.attribute',
    },
    {
      foreground: '#99F5D5',
      token: 'entity.name.scope-resolution',
    },
    {
      foreground: '#99F5D5',
      token: 'entity.name.class',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.numeric.go',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.byte.go',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.boolean.go',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.string.go',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.uintptr.go',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.error.go',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.rune.go',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.cs',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.generic.cs',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.modifier.cs',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.variable.cs',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.annotation.java',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.generic.java',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.java',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.object.array.java',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.primitive.array.java',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.primitive.java',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.token.java',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.groovy',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.annotation.groovy',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.parameters.groovy',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.generic.groovy',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.object.array.groovy',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.primitive.array.groovy',
    },
    {
      foreground: '#99F5D5',
      token: 'storage.type.primitive.groovy',
    },
    {
      foreground: '#99F5D5',
      token: 'meta.type.cast.expr',
    },
    {
      foreground: '#99F5D5',
      token: 'meta.type.new.expr',
    },
    {
      foreground: '#99F5D5',
      token: 'support.constant.math',
    },
    {
      foreground: '#99F5D5',
      token: 'support.constant.dom',
    },
    {
      foreground: '#99F5D5',
      token: 'support.constant.json',
    },
    {
      foreground: '#99F5D5',
      token: 'entity.other.inherited-class',
    },
    {
      foreground: '#969AF8',
      token: 'keyword.control',
    },
    {
      foreground: '#969AF8',
      token: 'source.cpp keyword.operator.new',
    },
    {
      foreground: '#969AF8',
      token: 'keyword.operator.delete',
    },
    {
      foreground: '#969AF8',
      token: 'keyword.other.using',
    },
    {
      foreground: '#969AF8',
      token: 'keyword.other.operator',
    },
    {
      foreground: '#969AF8',
      token: 'entity.name.operator',
    },
    {
      foreground: '#C2E9FF',
      token: 'variable',
    },
    {
      foreground: '#C2E9FF',
      token: 'meta.definition.variable.name',
    },
    {
      foreground: '#C2E9FF',
      token: 'support.variable',
    },
    {
      foreground: '#C2E9FF',
      token: 'entity.name.variable',
    },
    {
      foreground: '#66C7FF',
      token: 'variable.other.constant',
    },
    {
      foreground: '#66C7FF',
      token: 'variable.other.enummember',
    },
    {
      foreground: '#C2E9FF',
      token: 'meta.object-literal.key',
    },
    {
      foreground: '#D596F4',
      token: 'support.constant.property-value',
    },
    {
      foreground: '#D596F4',
      token: 'support.constant.font-name',
    },
    {
      foreground: '#D596F4',
      token: 'support.constant.media-type',
    },
    {
      foreground: '#D596F4',
      token: 'support.constant.media',
    },
    {
      foreground: '#D596F4',
      token: 'constant.other.color.rgb-value',
    },
    {
      foreground: '#D596F4',
      token: 'constant.other.rgb-value',
    },
    {
      foreground: '#D596F4',
      token: 'support.constant.color',
    },
    {
      foreground: '#D596F4',
      token: 'punctuation.definition.group.regexp',
    },
    {
      foreground: '#D596F4',
      token: 'punctuation.definition.group.assertion.regexp',
    },
    {
      foreground: '#D596F4',
      token: 'punctuation.definition.character-class.regexp',
    },
    {
      foreground: '#D596F4',
      token: 'punctuation.character.set.begin.regexp',
    },
    {
      foreground: '#D596F4',
      token: 'punctuation.character.set.end.regexp',
    },
    {
      foreground: '#D596F4',
      token: 'keyword.operator.negation.regexp',
    },
    {
      foreground: '#D596F4',
      token: 'support.other.parenthesis.regexp',
    },
    {
      foreground: '#BE5EEB',
      token: 'constant.character.character-class.regexp',
    },
    {
      foreground: '#BE5EEB',
      token: 'constant.other.character-class.set.regexp',
    },
    {
      foreground: '#BE5EEB',
      token: 'constant.other.character-class.regexp',
    },
    {
      foreground: '#BE5EEB',
      token: 'constant.character.set.regexp',
    },
    {
      foreground: '#FFF9C2',
      token: 'keyword.operator.or.regexp',
    },
    {
      foreground: '#FFF9C2',
      token: 'keyword.control.anchor.regexp',
    },
    {
      foreground: '#FFF48F',
      token: 'keyword.operator.quantifier.regexp',
    },
    {
      foreground: '#3CECAF',
      token: 'constant.character',
    },
    {
      foreground: '#FFF48F',
      token: 'constant.character.escape',
    },
    {
      foreground: '#C8C8C8',
      token: 'entity.name.label',
    },
    {
      foreground: '#3CECAF',
      token: 'constant.language',
    },
    {
      foreground: '#3CECAF',
      token: 'entity.name.tag',
    },
    {
      foreground: '#3CECAF',
      token: 'storage',
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
    'editorLineNumber.foreground': semanticColors['text-light'],
    'scrollbarSlider.background': semanticColors['fill-three'],
    'scrollbarSlider.hoverBackground': semanticColors['fill-three'],
  },
}
