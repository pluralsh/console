import ReactDiffViewer from 'react-diff-viewer'
import { useTheme } from 'styled-components'
import { Card } from '@pluralsh/design-system'
import chroma from 'chroma-js'

type DiffViewerProps = {
  oldValue: string
  oldTitle?: string
  newValue: string
  newTitle?: string
  splitView?: boolean
}

export default function DiffViewer({
  oldValue,
  oldTitle,
  newValue,
  newTitle,
  splitView = true,
}: DiffViewerProps) {
  const theme = useTheme()

  const commonColors = {
    diffViewerBackground: theme.colors['fill-one'],
    highlightBackground: theme.colors['fill-one-selected'],
    gutterBackground: theme.colors['fill-one-hover'],
    gutterColor: theme.colors['text-xlight'],
    codeFoldGutterBackground: theme.colors['fill-one-selected'],
    codeFoldBackground: theme.colors['fill-one-selected'],
    codeFoldContentColor: theme.colors.text,
    emptyLineBackground: theme.colors['fill-one-hover'],
  }

  return (
    <Card
      css={{
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        overflow: 'auto',
      }}
    >
      <ReactDiffViewer
        oldValue={oldValue}
        newValue={newValue}
        leftTitle={oldTitle}
        rightTitle={newTitle}
        splitView={splitView}
        useDarkTheme={theme.mode === 'dark'}
        styles={{
          line: { ...theme.partials.text.code },
          variables: {
            dark: {
              ...commonColors,
              removedBackground: chroma(theme.colors.red[800]).alpha(0.2).hex(),
              removedGutterBackground: chroma(theme.colors.red[800])
                .alpha(0.2)
                .hex(),
              wordRemovedBackground: chroma(theme.colors.red[500])
                .alpha(0.15)
                .hex(),
              addedBackground: chroma(theme.colors.green[850]).alpha(0.2).hex(),
              addedGutterBackground: chroma(theme.colors.green[850])
                .alpha(0.2)
                .hex(),
              wordAddedBackground: chroma(theme.colors.green[600])
                .alpha(0.15)
                .hex(),
            },
            light: {
              ...commonColors,
              removedBackground: chroma(theme.colors.red[100]).alpha(0.2).hex(),
              removedGutterBackground: chroma(theme.colors.red[100])
                .alpha(0.2)
                .hex(),
              wordRemovedBackground: chroma(theme.colors.red[500])
                .alpha(0.07)
                .hex(),
              addedBackground: chroma(theme.colors.green[100]).alpha(0.2).hex(),
              addedGutterBackground: chroma(theme.colors.green[100])
                .alpha(0.2)
                .hex(),
              wordAddedBackground: chroma(theme.colors.green[600])
                .alpha(0.07)
                .hex(),
            },
          },
        }}
      />
    </Card>
  )
}
