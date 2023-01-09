import { PageTitle } from '@pluralsh/design-system'
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
}: {
  heading: ReactNode
  headingContent?: ReactNode | undefined
  children: ReactNode
}) {
  return (
    <>
      {heading && (
        <PageTitle
          heading={heading}
          marginBottom="0"
        >
          {headingContent}
        </PageTitle>
      )}
      <ScrollablePageContent>{children}</ScrollablePageContent>
    </>
  )
}
