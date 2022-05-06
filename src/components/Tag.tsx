import { Flex, FlexProps, P } from 'honorable'

type TagProps = FlexProps

const propTypes = {}

function Tag({ children, ...props }: TagProps) {
  return (
    <Flex
      py={0.25}
      px={0.5}
      align="center"
      display="inline-block"
      backgroundColor="background-middle"
      borderRadius={1000}
      {...props}
    >
      <P body3>
        {children}
      </P>
    </Flex>
  )
}

Tag.propTypes = propTypes

export default Tag
