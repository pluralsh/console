import { ReactNode, RefObject } from 'react'
import styled, { CSSProperties } from 'styled-components'

import ConsolePageTitle, { PageTitleProps } from './ConsolePageTitle'

const ScrollablePageContent = styled.div<{
  $scrollable?: boolean
  $extraStyles?: CSSProperties
  $maxContentWidth?: number
  $fullWidth?: boolean
  $noPadding?: boolean
  $minWidth?: number
}>(
  ({
    theme,
    $scrollable: scrollable,
    $extraStyles: extraStyles,
    $maxContentWidth: maxContentWidth,
    $fullWidth: fullWidth,
    $noPadding: noPadding,
    $minWidth: minWidth,
  }) => ({
    position: 'relative',
    height: '100%',
    maxHeight: '100%',
    width: '100%',
    overflowY: scrollable ? 'auto' : 'hidden',
    overflowX: 'hidden',
    paddingRight: scrollable ? theme.spacing.small : 0,
    ...(scrollable ? { scrollbarGutter: 'stable' } : {}),
    ...(scrollable && fullWidth
      ? {
          paddingRight: theme.spacing.large - 6,
        }
      : {}),
    ...(minWidth ? { minWidth: minWidth } : {}),
    '& > .widthLimiter': {
      width: '100%',
      height: '100%',
      ...(!noPadding && {
        paddingTop: theme.spacing.medium,
        paddingBottom: scrollable ? theme.spacing.xxlarge : theme.spacing.large,
      }),

      ...(maxContentWidth
        ? { maxWidth: maxContentWidth, marginLeft: 'auto', marginRight: 'auto' }
        : {}),
      ...(extraStyles ?? {}),
    },
  })
)

const ScrollShadow = styled.div(({ theme }) => ({
  content: '""',
  backgroundColor: 'blue',
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  height: theme.spacing.medium,
  zIndex: theme.zIndexes.base + 10,
  background: `linear-gradient(0deg, transparent 0%, ${theme.colors['fill-zero']} 90%)`,
}))

export function ScrollablePage({
  heading,
  headingContent,
  contentStyles,
  children,
  scrollable = true,
  maxContentWidth,
  fullWidth,
  scrollRef,
  noPadding = false,
  minWidth,
  ...props
}: {
  heading?: ReactNode
  headingContent?: ReactNode | undefined
  contentStyles?: CSSProperties
  children: ReactNode
  scrollable?: boolean
  maxContentWidth?: number
  fullWidth?: boolean
  scrollRef?: RefObject<HTMLDivElement>
  noPadding?: boolean
  minWidth?: number
} & PageTitleProps) {
  return (
    <>
      {(heading || headingContent) && (
        <PaddingWrapperSC $pad={scrollable && fullWidth}>
          <TitleWrapperSC $maxContentWidth={maxContentWidth}>
            {scrollable && <ScrollShadow />}
            <ConsolePageTitle
              heading={heading}
              {...props}
            >
              {headingContent}
            </ConsolePageTitle>
          </TitleWrapperSC>
        </PaddingWrapperSC>
      )}
      <ScrollablePageContent
        $scrollable={scrollable}
        $extraStyles={contentStyles}
        $maxContentWidth={maxContentWidth}
        $fullWidth={fullWidth}
        $minWidth={minWidth}
        ref={scrollRef}
        $noPadding={noPadding}
      >
        <div className="widthLimiter">{children}</div>
      </ScrollablePageContent>
    </>
  )
}

const PaddingWrapperSC = styled.div<{ $pad?: boolean }>(({ $pad, theme }) => ({
  paddingRight: $pad ? theme.spacing.large : undefined,
}))

const TitleWrapperSC = styled.div<{ $maxContentWidth?: number }>(
  ({ $maxContentWidth }) => ({
    position: 'relative',
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: $maxContentWidth,
  })
)
