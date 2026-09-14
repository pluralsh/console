import Flex, { type FlexProps } from './Flex'
import { type ComponentProps, type ReactNode } from 'react'
import styled, { useTheme } from 'styled-components'

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
  const theme = useTheme()

  return (
    <Flex
      ref={ref}
      css={{ borderBottom: theme.borders.default }}
      paddingBottom="large"
      marginBottom="large"
      gap="large"
      alignItems="center"
      justifyContent="space-between"
      {...props}
    >
      {heading && <HeadingSC {...headingProps}>{heading}</HeadingSC>}
      {children}
    </Flex>
  )
}

const HeadingSC = styled.h1(({ theme }) => ({
  margin: 0,
  ...theme.partials.text.title1,
}))

export default PageTitle
