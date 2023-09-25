import { Div, FlexProps } from 'honorable'
import { ReactNode, Ref } from 'react'
import styled, { CSSProperties } from 'styled-components'

import ConsolePageTitle from './ConsolePageTitle'

const ScrollablePageContent = styled.div<{
  scrollable?: boolean
  extraStyles?: CSSProperties
  maxContentWidth?: number
  fullWidth?: boolean
}>(({ theme, scrollable, extraStyles, maxContentWidth, fullWidth }) => ({
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
  '& > .widthLimiter': {
    width: '100%',
    paddingTop: theme.spacing.medium,
    paddingBottom: scrollable ? theme.spacing.xxlarge : theme.spacing.large,
    ...(!scrollable
      ? {
          height: '100%',
        }
      : {}),
    ...(maxContentWidth
      ? { maxWidth: maxContentWidth, marginLeft: 'auto', marginRight: 'auto' }
      : {}),
    ...(extraStyles ?? {}),
  },
}))

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
  ...props
}: {
  heading: ReactNode
  headingContent?: ReactNode | undefined
  contentStyles?: CSSProperties
  children: ReactNode
  scrollable?: boolean
  maxContentWidth?: number
  fullWidth?: boolean
  scrollRef?: Ref<any>
} & FlexProps) {
  return (
    <>
      {heading && (
        <Div paddingRight={scrollable && fullWidth ? 'large' : undefined}>
          <Div
            position="relative"
            width="100%"
            marginLeft="auto"
            marginRight="auto"
            maxWidth={maxContentWidth}
          >
            {scrollable && <ScrollShadow />}
            <ConsolePageTitle
              heading={heading}
              {...props}
            >
              {headingContent}
            </ConsolePageTitle>
          </Div>
        </Div>
      )}
      <ScrollablePageContent
        scrollable={scrollable}
        extraStyles={contentStyles}
        maxContentWidth={maxContentWidth}
        fullWidth={fullWidth}
        ref={scrollRef}
      >
        <div className="widthLimiter">{children}</div>
      </ScrollablePageContent>
    </>
  )
}
