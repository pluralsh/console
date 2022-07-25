import { DivProps, Flex, FlexProps, H1 } from 'honorable'
import { ReactNode, forwardRef } from 'react'

export type PageTitleProps = {
  heading: ReactNode
  headingProps: DivProps
} & FlexProps

const PageTitle = forwardRef<HTMLDivElement, PageTitleProps>(
  ({ heading, headingProps, children, ...props }) => (
    <Flex
      borderBottom="1px solid border"
      paddingBottom="large"
      marginBottom="large"
      gap="large"
      alignItems="center"
      justifyContent="space-between"
      {...props}
    >
      <H1
        title1
        {...headingProps}
      >
        {heading}
      </H1>
      {children}
    </Flex>
  )
)

export default PageTitle
