import { PageTitle } from '@pluralsh/design-system'
import { FlexProps } from 'honorable'
import { ReactNode } from 'react'
import styled from 'styled-components'

const ScrollablePageContent = styled.div(({ theme }) => ({
  height: '100%',
  maxHeight: '100%',
  width: '100%',
  overflowY: 'auto',
  paddingTop: theme.spacing.large,
  paddingRight: theme.spacing.small,
}))

export function ScrollablePage({
  heading,
  headingContent,
  children,
  ...props
}: {
  heading: ReactNode
  headingContent?: ReactNode | undefined
  children: ReactNode
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
      <ScrollablePageContent>{children}</ScrollablePageContent>
    </>
  )
}
