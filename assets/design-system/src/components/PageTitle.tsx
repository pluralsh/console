import { Flex, type FlexProps, H1 } from 'honorable'
import { type ComponentProps, type ReactNode } from 'react'

export type PageTitleProps = {
  heading?: ReactNode
  headingProps?: ComponentProps<'h1'>
} & FlexProps

function PageTitle({
  ref,
  heading,
  headingProps = {},
  children,
  ...props
}: PageTitleProps) {
  return (
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
}

export default PageTitle
