import { PageTitle } from '@pluralsh/design-system'
import { FlexProps } from 'honorable'
import { ReactNode } from 'react'
import styled, { CSSProperties } from 'styled-components'

const ScrollablePageContent = styled.div<{ scrollable?: boolean, extraStyles?: CSSProperties }>(({ theme, scrollable, extraStyles }) => ({
  height: '100%',
  maxHeight: '100%',
  width: '100%',
  overflowY: scrollable ? 'auto' : 'hidden',
  paddingTop: theme.spacing.large,
  paddingRight: scrollable ? theme.spacing.small : 0,
  ...(extraStyles ?? {}),
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
  return (
    <>
      {heading && (
        <PageTitle
          heading={heading}
          marginBottom="0"
          {...props}
        >
          {headingContent}
        </PageTitle>
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
