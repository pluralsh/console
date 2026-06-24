import hljs from 'highlight.js/lib/core'
import { useMemo } from 'react'
import styled, { type DefaultTheme } from 'styled-components'
import chroma from 'chroma-js'

import '../hljs'
import { hljsSyntaxStyles } from '../styles/hljsSyntaxStyles'

type PatchLineType = 'addition' | 'deletion' | 'context'

type DisplayPatchLine = {
  type: PatchLineType
  html: string
}

type PatchHighlightProps = {
  children: string
  showLineNumbers?: boolean
  patchLanguage?: string
}

function getPatchLineType(line: string): PatchLineType | null {
  if (
    line.startsWith('@@') ||
    line.startsWith('diff --git') ||
    line.startsWith('index ') ||
    line.startsWith('--- ') ||
    line.startsWith('+++ ') ||
    line.startsWith('new file mode') ||
    line.startsWith('deleted file mode') ||
    line.startsWith('similarity index') ||
    line.startsWith('rename from') ||
    line.startsWith('rename to') ||
    line.startsWith('\\')
  ) {
    return null
  }

  if (line.startsWith('+')) return 'addition'
  if (line.startsWith('-')) return 'deletion'
  if (line.startsWith(' ') || line === '') return 'context'

  return 'context'
}

function patchLineContent(line: string, type: PatchLineType) {
  if (type === 'context') {
    return line.startsWith(' ') ? line.slice(1) : line
  }

  return line.slice(1)
}

function patchLineBackground(type: PatchLineType, theme: DefaultTheme) {
  switch (type) {
    case 'addition':
      return chroma(theme.colors.green[850]).alpha(0.3).css()
    case 'deletion':
      return chroma(theme.colors.red[800]).alpha(0.3).css()
    default:
      return 'transparent'
  }
}

function highlightPatchLine(
  line: string,
  patchLanguage?: string
): DisplayPatchLine | null {
  const type = getPatchLineType(line)

  if (!type) return null

  const content = patchLineContent(line, type)
  const language =
    patchLanguage && hljs.getLanguage(patchLanguage)
      ? patchLanguage
      : 'plaintext'
  const html = content ? hljs.highlight(content, { language }).value : '&nbsp;'

  return { type, html }
}

function buildDisplayLines(content: string, patchLanguage?: string) {
  return content
    .split(/\r?\n/)
    .map((line) => highlightPatchLine(line, patchLanguage))
    .filter((line): line is DisplayPatchLine => line != null)
}

export default function PatchHighlight({
  children,
  showLineNumbers = true,
  patchLanguage,
}: PatchHighlightProps) {
  const displayLines = useMemo(
    () => buildDisplayLines(children, patchLanguage),
    [children, patchLanguage]
  )

  return (
    <PatchSyntaxStyles>
      <PatchWrap>
        {displayLines.map(({ type, html }, index) => (
          <PatchLineSC
            key={index}
            $type={type}
          >
            {showLineNumbers && (
              <LineNumberSC aria-hidden>{index + 1}</LineNumberSC>
            )}
            <LineContentSC>
              <code
                className="hljs"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </LineContentSC>
          </PatchLineSC>
        ))}
      </PatchWrap>
    </PatchSyntaxStyles>
  )
}

const PatchSyntaxStyles = styled.div(({ theme }) => hljsSyntaxStyles(theme))

const PatchWrap = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  minWidth: 0,
  paddingTop: theme.spacing.medium,
  paddingBottom: theme.spacing.medium,
  color: theme.colors['text-light'],
  fontFamily: '"Roboto Mono", monospace',
  fontSize: 14,
  lineHeight: '22px',
  letterSpacing: '0.25px',
}))

const PatchLineSC = styled.div<{ $type: PatchLineType }>(
  ({ theme, $type }) => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing.medium,
    width: '100%',
    padding: `0 ${theme.spacing.medium}px`,
    backgroundColor: patchLineBackground($type, theme),
  })
)

const LineNumberSC = styled.span(({ theme }) => ({
  color: theme.colors['text-xlight'],
  flexShrink: 0,
  minWidth: 18,
  paddingRight: theme.spacing.large,
  textAlign: 'right',
  userSelect: 'none',
}))

const LineContentSC = styled.div({
  flex: 1,
  minWidth: 0,
  overflowX: 'auto',
  color: 'inherit',

  'code.hljs': {
    display: 'block',
    padding: 0,
    background: 'none',
    color: 'inherit',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
})
