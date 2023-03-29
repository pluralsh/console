import { Divider } from '@pluralsh/design-system'
import { Flex, FlexProps } from 'honorable'

export default function PropWide({
  children,
  title,
  ...props
}: {
  children: JSX.Element | JSX.Element[] | string
  title: string
} & FlexProps) {
  return (
    <Flex
      align="center"
      gap="small"
      marginVertical="small"
    >
      <Flex
        overline
        color="text-xlight"
      >
        {title}
      </Flex>
      <Divider
        backgroundColor="border-fill-three"
        flexGrow={1}
      />
      <Flex {...props}>{children}</Flex>
    </Flex>
  )
}
