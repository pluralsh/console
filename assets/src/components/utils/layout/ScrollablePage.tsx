import { Div, FlexProps } from 'honorable'
import { ReactNode } from 'react'
import styled, { CSSProperties, useTheme } from 'styled-components'

import ConsolePageTitle from './ConsolePageTitle'

const ScrollablePageContent = styled.div<{
  scrollable?: boolean
  extraStyles?: CSSProperties
}>(({ theme, scrollable, extraStyles }) => ({
  height: '100%',
  maxHeight: '100%',
  width: '100%',
  overflowY: scrollable ? 'auto' : 'hidden',
  overflowX: 'hidden',
  paddingTop: theme.spacing.medium,
  paddingRight: scrollable ? theme.spacing.small : 0,
  paddingBottom: scrollable ? theme.spacing.xxlarge : theme.spacing.large,
  ...(extraStyles ?? {}),
  position: 'relative',
}))

const ScrollShadow = styled.div(({ theme }) => ({
  content: '""',
  backgroundColor: 'blue',
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  height: theme.spacing.medium,
  zIndex: theme.zIndexes.base + 1,
  background: `linear-gradient(0deg, transparent 0%, ${theme.colors['fill-zero']} 90%)`,
}))

export function ScrollablePage({
  heading,
  headingContent,
  contentStyles,
  children,
  scrollable = true,
  ...props
}: {
  heading: ReactNode
  headingContent?: ReactNode | undefined
  contentStyles?: CSSProperties
  children: ReactNode
  scrollable?: boolean
} & FlexProps) {
  const theme = useTheme()

  return (
    <>
      {heading && (
        <Div position="relative">
          {scrollable && <ScrollShadow />}
          <ConsolePageTitle
            heading={heading}
            {...props}
          >
            {headingContent}
          </ConsolePageTitle>{' '}
        </Div>
      )}
      <ScrollablePageContent
        scrollable={scrollable}
        extraStyles={contentStyles}
      >
        {children}
      </ScrollablePageContent>
    </>
  )
}
