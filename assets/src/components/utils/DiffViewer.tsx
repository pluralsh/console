import ReactDiffViewer from 'react-diff-viewer'
import { useTheme } from 'styled-components'
import { Card } from '@pluralsh/design-system'

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
              diffViewerBackground: theme.colors['fill-one'],
              highlightBackground: theme.colors['fill-one-selected'],
              gutterBackground: theme.colors['fill-one-hover'],
              gutterColor: theme.colors['text-xlight'],
              codeFoldGutterBackground: theme.colors['fill-one-selected'],
              codeFoldBackground: theme.colors['fill-one-selected'],
              codeFoldContentColor: theme.colors.text,
              emptyLineBackground: theme.colors['fill-one-hover'],
            },
          },
        }}
      />
    </Card>
  )
}
