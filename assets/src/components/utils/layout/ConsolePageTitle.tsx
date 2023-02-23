import {
  DivProps,
  Flex,
  FlexProps,
  H1,
} from 'honorable'
import { ReactNode, forwardRef } from 'react'

export type PageTitleProps = {
  heading?: ReactNode
  headingProps?: DivProps
} & FlexProps

const ConsolePageTitle = forwardRef<HTMLDivElement, PageTitleProps>(({
  heading, headingProps = {}, children, ...props
}, ref) => (
  <Flex
    ref={ref}
    gap="large"
    alignItems="center"
    justifyContent="space-between"
    position="relative"
    minHeight={40}
    {...props}
  >
    {heading && (
      <H1
        title2
        marginBottom="-0.1em" // optically center title
        {...headingProps}
      >
        {heading}
      </H1>
    )}
    {children}
  </Flex>
))

export default ConsolePageTitle
