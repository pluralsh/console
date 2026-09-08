import { Flex, FlexProps } from '@pluralsh/design-system'

export function StretchedFlex(props: FlexProps) {
  return (
    <Flex
      width="100%"
      justify="space-between"
      align="center"
      {...props}
    />
  )
}
