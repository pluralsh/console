import type { Monaco } from '@monaco-editor/react'

export const REGO_LANGUAGE_ID = 'rego'

const KEYWORDS = [
  'as',
  'contains',
  'default',
  'else',
  'every',
  'if',
  'import',
  'in',
  'not',
  'package',
  'some',
  'with',
]

const CONSTANTS = ['false', 'null', 'true']

export function registerRegoLanguage(monaco: Monaco) {
  if (monaco.languages.getLanguages().some((l) => l.id === REGO_LANGUAGE_ID)) {
    return
  }

  monaco.languages.register({
    id: REGO_LANGUAGE_ID,
    aliases: ['Rego', 'rego'],
    extensions: ['.rego'],
  })

  monaco.languages.setLanguageConfiguration(REGO_LANGUAGE_ID, {
    comments: { lineComment: '#' },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: '`', close: '`' },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: '`', close: '`' },
    ],
  })

  monaco.languages.setMonarchTokensProvider(REGO_LANGUAGE_ID, {
    defaultToken: '',
    tokenPostfix: '.rego',
    keywords: KEYWORDS,
    constants: CONSTANTS,
    tokenizer: {
      root: [
        [/#.*$/, 'comment'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string'],
        [/`/, 'string', '@rawstring'],
        [/\d+\.\d+([eE][+-]?\d+)?/, 'constant.numeric'],
        [/\d+/, 'constant.numeric'],
        [/[{}()[\]]/, '@brackets'],
        [/:=|==|!=|<=|>=/, 'keyword.operator'],
        [/[+\-*/%|&!=<>]/, 'keyword.operator'],
        [
          /[a-zA-Z_][\w.]*(?=\s*\()/,
          {
            cases: {
              '@keywords': 'keyword',
              '@default': 'support.function',
            },
          },
        ],
        [
          /[a-zA-Z_][\w]*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@constants': 'constant.language',
              '@default': 'identifier',
            },
          },
        ],
      ],
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop'],
      ],
      rawstring: [
        [/[^`]+/, 'string'],
        [/`/, 'string', '@pop'],
      ],
    },
  })
}
