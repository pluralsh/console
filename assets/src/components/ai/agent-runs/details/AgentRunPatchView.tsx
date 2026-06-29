import { CaptionP } from 'components/utils/typography/Text'
import chroma from 'chroma-js'
import { useMemo } from 'react'
import { Diff, Hunk, markEdits, parseDiff, tokenize } from 'react-diff-view'
import styled, { useTheme } from 'styled-components'
import 'react-diff-view/style/index.css'

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
        {(hunks) =>
          hunks.map((hunk) => (
            <Hunk
              key={hunk.content}
              hunk={hunk}
            />
          ))
        }
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
  }
})
