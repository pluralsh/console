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

// saturated hues (as in GitHub and Cursor) so tinted rows read as red or green over any fill, with changed
// words clearly stronger than their row; the palette's own reds and greens go muddy at these opacities
const DIFF_RED = '#f85149'
const DIFF_GREEN = '#3fb950'

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
    const colors = {
      diffViewerBackground: 'transparent',
      gutterBackground: 'transparent',
      codeFoldGutterBackground: 'transparent',
      addedColor: theme.colors.text,
      removedColor: theme.colors.text,
      removedBackground: opacity(DIFF_RED, 0.18),
      removedGutterBackground: opacity(DIFF_RED, 0.18),
      wordRemovedBackground: opacity(DIFF_RED, 0.4),
      addedBackground: opacity(DIFF_GREEN, 0.16),
      addedGutterBackground: opacity(DIFF_GREEN, 0.16),
      wordAddedBackground: opacity(DIFF_GREEN, 0.4),
    }

    return merge(
      {
        content: {
          width: '100%',
          overflow: 'visible',
        },
        line: { ...theme.partials.text.code },
        gutter: {
          '&& pre': {
            opacity: 1,
            color: theme.colors['text-xlight'],
            ...theme.partials.text.mono,
          },
          minWidth: 'fit-content',
          paddingLeft: theme.spacing.medium,
          paddingRight: theme.spacing.large,
          wordBreak: 'normal',
        },
        marker: { '& pre': theme.partials.text.mono },
        codeFold: { '& a': { color: theme.colors['text-xlight'] } },
        codeFoldContent: { color: theme.colors['text-xlight'] },
        contentText: {
          paddingRight: theme.spacing.medium,
          lineBreak: 'auto',
          ...theme.partials.text.mono,
        },
        emptyLine: { backgroundColor: 'transparent' },
        diffContainer: { wordBreak: 'break-word', tabSize: 2, minWidth: 0 },
        variables: {
          dark: colors,
          light: colors,
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
