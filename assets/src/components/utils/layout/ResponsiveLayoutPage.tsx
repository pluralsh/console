import { Flex, FlexProps } from 'honorable'

export function ResponsiveLayoutPage({ children, ...props }: FlexProps) {
  return (
    <Flex
      height="100%"
      width="100%"
      overflowY="hidden"
      paddingTop="large"
      paddingLeft="large"
      paddingRight="large"
      paddingBottom={0}
      flexGrow={1}
      {...props}
    >
      {children}
    </Flex>
  )
}
