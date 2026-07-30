import { useMemo } from 'react'
import ReactDiffViewer, {
  DiffMethod,
  type ReactDiffViewerProps,
} from 'react-diff-viewer-continued'
import { merge } from 'lodash-es'
import chroma from 'chroma-js'
import { useTheme } from 'styled-components'

import Card, { type CardProps } from './Card'
import WrapWithIf from './WrapWithIf'

export { DiffMethod }
export type { ReactDiffViewerProps }

const opacity = (color: string, amount: number) =>
  chroma(color).alpha(amount).hex()

export type DiffViewerProps = Omit<
  ReactDiffViewerProps,
  'leftTitle' | 'rightTitle'
> & {
  asCard?: boolean
  cardProps?: CardProps
}

export function DiffViewer({
  styles,
  asCard = true,
  cardProps,
  hideSummary = true,
  ...props
}: DiffViewerProps) {
  const theme = useTheme()

  const mergedStyles = useMemo(() => {
    const commonColors = {
      diffViewerBackground: 'transparent',
      gutterBackground: 'transparent',
      codeFoldGutterBackground: 'transparent',
    }

    return merge(
      {
        content: {
          width: '100%',
          overflow: 'visible',
        },
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
        contentText: { paddingRight: theme.spacing.medium, lineBreak: 'auto' },
        emptyLine: { backgroundColor: 'transparent' },
        diffContainer: { wordBreak: 'break-word', tabSize: 2, minWidth: 0 },
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
            ...cardProps?.css,
          }}
        />
      }
    >
      <ReactDiffViewer
        useDarkTheme={theme.mode === 'dark'}
        styles={mergedStyles}
        hideSummary={hideSummary}
        {...props}
      />
    </WrapWithIf>
  )
}

export default DiffViewer
