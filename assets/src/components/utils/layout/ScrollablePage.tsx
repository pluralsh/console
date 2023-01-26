import { PageTitle } from '@pluralsh/design-system'
import { FlexProps } from 'honorable'
import { ReactNode } from 'react'
import styled from 'styled-components'

const ScrollablePageContent = styled.div<{paddingRight, paddingTop}>(({ theme, paddingRight, paddingTop }) => ({
  height: '100%',
  maxHeight: '100%',
  width: '100%',
  overflowY: 'auto',
  paddingTop: paddingTop !== undefined ? paddingTop : theme.spacing.large,
  paddingRight: paddingRight !== undefined ? paddingRight : theme.spacing.small,
}))

export function ScrollablePage({
  heading,
  headingContent,
  contentPaddingRight,
  contentPaddingTop,
  children,
  ...props
}: {
  heading: ReactNode
  headingContent?: ReactNode | undefined
  contentPaddingRight?: string | number | undefined
  contentPaddingTop?: string | number | undefined
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
      <ScrollablePageContent
        paddingRight={contentPaddingRight}
        paddingTop={contentPaddingTop}
      >{children}
      </ScrollablePageContent>
    </>
  )
}
