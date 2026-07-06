import { CaptionP } from 'components/utils/typography/Text'
import chroma from 'chroma-js'
import pluralize from 'pluralize'
import { useMemo, type ReactElement } from 'react'
import {
  Decoration,
  Diff,
  Hunk,
  getCollapsedLinesCountBetween,
  markEdits,
  parseDiff,
  tokenize,
} from 'react-diff-view'
import type { HunkData } from 'react-diff-view'
import styled, { useTheme } from 'styled-components'
import 'react-diff-view/style/index.css'

const MIN_COLLAPSED_LINES_TO_SHOW = 1

function collapsedLinesBeforeHunk(hunks: HunkData[], index: number) {
  const hunk = hunks[index]
  const previousHunk = index > 0 ? hunks[index - 1] : null

  if (!previousHunk) {
    return Math.max(0, hunk.oldStart - 1)
  }

  return Math.max(0, getCollapsedLinesCountBetween(previousHunk, hunk))
}

function renderHunksWithCollapsedIndicators(hunks: HunkData[]): ReactElement[] {
  const elements: ReactElement[] = []

  hunks.forEach((hunk, index) => {
    const collapsedLines = collapsedLinesBeforeHunk(hunks, index)

    if (collapsedLines >= MIN_COLLAPSED_LINES_TO_SHOW) {
      elements.push(
        <CollapsedLinesDecoration
          key={`collapsed-${hunk.content}`}
          count={collapsedLines}
        />
      )
    }

    elements.push(
      <Hunk
        key={hunk.content}
        hunk={hunk}
      />
    )
  })

  return elements
}

function CollapsedLinesDecoration({ count }: { count: number }) {
  return (
    <Decoration contentClassName="agent-run-diff-collapsed-content">
      <CollapsedLinesLabelSC>
        {count} unchanged {pluralize('line', count)} hidden
      </CollapsedLinesLabelSC>
    </Decoration>
  )
}

export function AgentRunPatchView({ patch }: { patch: string }) {
  const theme = useTheme()
  const { file, tokens } = useMemo(() => {
    const parsedFile = parseDiff(patch)[0]

    if (!parsedFile?.hunks?.length) {
      return { file: parsedFile, tokens: null }
    }

    return {
      file: parsedFile,
      tokens: tokenize(parsedFile.hunks, {
        enhancers: [markEdits(parsedFile.hunks, { type: 'line' })],
      }),
    }
  }, [patch])

  if (!file?.hunks?.length || !tokens) {
    return (
      <PatchEmptySC>
        <CaptionP $color="text-light">Unable to display diff.</CaptionP>
      </PatchEmptySC>
    )
  }

  const insertEditBackground =
    theme.mode === 'dark'
      ? chroma(theme.colors.green[600]).alpha(0.45).css()
      : chroma(theme.colors.green[600]).alpha(0.25).css()
  const deleteEditBackground =
    theme.mode === 'dark'
      ? chroma(theme.colors.red[500]).alpha(0.45).css()
      : chroma(theme.colors.red[500]).alpha(0.2).css()

  return (
    <PatchViewSC
      $deleteEditBackground={deleteEditBackground}
      $insertEditBackground={insertEditBackground}
    >
      <Diff
        diffType={file.type}
        hunks={file.hunks}
        tokens={tokens}
        viewType="unified"
      >
        {renderHunksWithCollapsedIndicators}
      </Diff>
    </PatchViewSC>
  )
}

const PatchEmptySC = styled.div(({ theme }) => ({
  padding: theme.spacing.large,
}))

const PatchViewSC = styled.div<{
  $deleteEditBackground: string
  $insertEditBackground: string
}>(({ theme, $deleteEditBackground, $insertEditBackground }) => {
  const insertBackground = chroma(theme.colors.green[850]).alpha(0.3).css()
  const deleteBackground = chroma(theme.colors.red[800]).alpha(0.3).css()

  return {
    '--diff-background-color': theme.colors['fill-accent'],
    '--diff-text-color': theme.colors['text-light'],
    '--diff-font-family': '"Roboto Mono", monospace',
    '--diff-gutter-insert-background-color': insertBackground,
    '--diff-gutter-insert-text-color': theme.colors['text-light'],
    '--diff-gutter-delete-background-color': deleteBackground,
    '--diff-gutter-delete-text-color': theme.colors['text-light'],
    '--diff-code-insert-background-color': insertBackground,
    '--diff-code-insert-text-color': theme.colors['text-light'],
    '--diff-code-delete-background-color': deleteBackground,
    '--diff-code-delete-text-color': theme.colors['text-light'],
    '--diff-code-insert-edit-background-color': $insertEditBackground,
    '--diff-code-insert-edit-text-color': theme.colors['text-light'],
    '--diff-code-delete-edit-background-color': $deleteEditBackground,
    '--diff-code-delete-edit-text-color': theme.colors['text-light'],
    paddingTop: theme.spacing.medium,
    paddingBottom: theme.spacing.medium,
    width: '100%',
    minWidth: 0,

    '.diff-line': {
      fontSize: 14,
      letterSpacing: '0.25px',
      lineHeight: '22px',
    },

    '.diff-gutter-normal': {
      backgroundColor: 'transparent',
      color: theme.colors['text-xlight'],
    },

    '.diff-code-normal': {
      backgroundColor: 'transparent',
    },

    '.diff-code-edit': {
      borderRadius: 2,
      boxDecorationBreak: 'clone',
      WebkitBoxDecorationBreak: 'clone',
      padding: '0 1px',
    },

    '.diff-gutter': {
      paddingLeft: theme.spacing.medium,
      paddingRight: theme.spacing.large,
    },

    '.diff-code': {
      paddingRight: theme.spacing.medium,
      wordBreak: 'break-word',
    },

    '.diff-decoration': {
      backgroundColor: theme.colors['fill-accent'],
    },

    '.agent-run-diff-collapsed-content': {
      backgroundColor: theme.colors['fill-accent'],
      padding: `${theme.spacing.xxsmall}px ${theme.spacing.medium}px`,
      textAlign: 'center',
    },
  }
})

const CollapsedLinesLabelSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  display: 'inline-block',
  lineHeight: '96px',
  userSelect: 'none',
  whiteSpace: 'nowrap',
}))
