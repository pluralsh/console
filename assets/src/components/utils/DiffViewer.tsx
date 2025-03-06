import ReactDiffViewer, { ReactDiffViewerProps } from 'react-diff-viewer'
import { useTheme } from 'styled-components'
import { Card, CardProps, WrapWithIf } from '@pluralsh/design-system'
import chroma from 'chroma-js'
import { merge } from 'lodash'
import { useMemo } from 'react'

const opacity = (color: string, opacity: number) => {
  return chroma(color).alpha(opacity).hex()
}

export default function DiffViewer({
  styles,
  asCard = true,
  cardProps,
  ...props
}: Omit<ReactDiffViewerProps, 'leftTitle' | 'rightTitle'> & {
  asCard?: boolean
  cardProps?: CardProps
}) {
  const theme = useTheme()

  const mergedStyles = useMemo(() => {
    const commonColors = {
      diffViewerBackground: 'transparent',
      gutterBackground: 'transparent',
      codeFoldGutterBackground: 'transparent',
    }
    return merge(
      {
        line: { ...theme.partials.text.code },
        gutter: {
          '&& pre': { opacity: 1, color: theme.colors['text-xlight'] },
          minWidth: 'fit-content',
          paddingLeft: theme.spacing.medium,
          paddingRight: theme.spacing.large,
          wordBreak: 'normal',
        },
        codeFold: { '& a': { color: theme.colors['text-xlight'] } },
        codeFoldContent: { color: theme.colors['text-xlight'] },
        contentText: { paddingRight: theme.spacing.medium },
        emptyLine: { backgroundColor: 'transparent' },
        diffContainer: { wordBreak: 'break-word', tabSize: 2 },
        variables: {
          dark: {
            ...commonColors,
            removedBackground: opacity(theme.colors.red[800], 0.2),
            removedGutterBackground: opacity(theme.colors.red[800], 0.2),
            wordRemovedBackground: opacity(theme.colors.red[500], 0.15),
            addedBackground: opacity(theme.colors.green[850], 0.2),
            addedGutterBackground: opacity(theme.colors.green[850], 0.2),
            wordAddedBackground: opacity(theme.colors.green[600], 0.15),
          },
          light: {
            ...commonColors,
            removedBackground: opacity(theme.colors.red[100], 0.2),
            removedGutterBackground: opacity(theme.colors.red[100], 0.2),
            wordRemovedBackground: opacity(theme.colors.red[500], 0.07),
            addedBackground: opacity(theme.colors.green[100], 0.2),
            addedGutterBackground: opacity(theme.colors.green[100], 0.2),
            wordAddedBackground: opacity(theme.colors.green[600], 0.07),
          },
        },
      },
      styles
    )
  }, [styles, theme])

  return (
    <WrapWithIf
      condition={asCard}
      wrapper={
        <Card
          {...cardProps}
          css={{
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '100%',
            overflow: 'auto',
          }}
        />
      }
    >
      <ReactDiffViewer
        useDarkTheme={theme.mode === 'dark'}
        styles={mergedStyles}
        {...props}
      />
    </WrapWithIf>
  )
}
