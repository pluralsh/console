import { Ref, forwardRef } from 'react'
import { Flex, FlexProps, P } from 'honorable'

type TagProps = FlexProps

const propTypes = {}

function TagRef({ children, ...props }: TagProps, ref: Ref<any>) {
  return (
    <Flex
      ref={ref}
      py={0.25}
      px={0.5}
      align="center"
      display="inline-block"
      backgroundColor="background-middle"
      borderRadius={1000}
      {...props}
    >
      <P caption>
        {children}
      </P>
    </Flex>
  )
}

const Tag = forwardRef(TagRef)

Tag.propTypes = propTypes

export default Tag
