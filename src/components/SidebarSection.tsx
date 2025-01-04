import { Flex, type FlexProps } from 'honorable'

import { useSidebar } from './Sidebar'

type SidebarSectionProps = FlexProps & {
  grow?: number
}

const styles = {
  '&:last-of-type': {
    border: 'none',
  },
}

function SidebarSection({ grow = 0, ...props }: SidebarSectionProps) {
  const { layout } = useSidebar()
  const isHorizontal = layout === 'horizontal'

  return (
    <Flex
      direction={isHorizontal ? 'row' : 'column'}
      grow={grow}
      align="center"
      borderBottom={isHorizontal ? '' : '1px solid border'}
      gap={isHorizontal ? 'medium' : 'xxsmall'}
      padding={12}
      width={isHorizontal ? 'auto' : '100%'}
      {...styles}
      {...props}
    />
  )
}

export default SidebarSection
