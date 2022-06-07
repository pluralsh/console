import { Ref, forwardRef } from 'react'
import { Flex, FlexProps, P } from 'honorable'

type TagProps = FlexProps

const propTypes = {}

function TagRef({ children, ...props }: TagProps, ref: Ref<any>) {
  return (
    <Flex
      ref={ref}
      paddingVertical="xxsmall"
      paddingHorizontal="xsmall"
      align="center"
      display="inline-block"
      backgroundColor="fill-one"
      borderRadius="medium"
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
