import { type DivProps, Flex, type FlexProps, H1 } from 'honorable'
import { type ReactNode, forwardRef } from 'react'

export type PageTitleProps = {
  heading?: ReactNode
  headingProps?: DivProps
} & FlexProps

const PageTitle = forwardRef<HTMLDivElement, PageTitleProps>(
  ({ heading, headingProps = {}, children, ...props }, ref) => (
    <Flex
      ref={ref}
      borderBottom="1px solid border"
      paddingBottom="large"
      marginBottom="large"
      gap="large"
      alignItems="center"
      justifyContent="space-between"
      {...props}
    >
      {heading && (
        <H1
          title1
          {...headingProps}
        >
          {heading}
        </H1>
      )}
      {children}
    </Flex>
  )
)

export default PageTitle
