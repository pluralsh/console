import { Flex, FlexProps } from 'honorable'
import PropTypes from 'prop-types'
import { Ref, forwardRef } from 'react'

type SidebarSectionProps = FlexProps & {
  grow?: number
}

const propTypes = {
  grow: PropTypes.number,
}

const styles = {
  ':last-of-type': {
    border: 'none',
  },
}

function SidebarSectionRef({ children, grow = 0, ...props }: SidebarSectionProps, ref: Ref<any>) {
  return (
    <Flex
      direction="column"
      grow={grow}
      justify="start"
      align="center"
      ref={ref}
      borderBottom="1px solid border"
      padding={12}
      {...styles}
      {...props}
    >
      {children}
    </Flex>
  )
}

const SidebarSection = forwardRef(SidebarSectionRef)

SidebarSection.propTypes = propTypes

export default SidebarSection
