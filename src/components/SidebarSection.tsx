import { Flex, type FlexProps } from 'honorable'
import { type Ref, forwardRef } from 'react'

import { useSidebar } from './Sidebar'

type SidebarSectionProps = FlexProps & {
  grow?: number
}

const styles = {
  ':last-of-type': {
    border: 'none',
  },
}

function SidebarSectionRef(
  { grow = 0, ...props }: SidebarSectionProps,
  ref: Ref<any>
) {
  const { layout } = useSidebar()
  const isHorizontal = layout === 'horizontal'

  return (
    <Flex
      direction={isHorizontal ? 'row' : 'column'}
      grow={grow}
      align="center"
      ref={ref}
      borderBottom={isHorizontal ? '' : '1px solid border'}
      gap={isHorizontal ? 'medium' : 'xsmall'}
      padding={12}
      {...styles}
      {...props}
    />
  )
}

const SidebarSection = forwardRef(SidebarSectionRef)

export default SidebarSection
