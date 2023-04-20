import { Flex, type FlexProps } from 'honorable'
import {
  Children,
  type Ref,
  cloneElement,
  forwardRef,
  isValidElement,
} from 'react'

import { type SidebarLayout } from './Sidebar'

type SidebarSectionProps = FlexProps & {
  grow?: number
  layout?: SidebarLayout
}

const styles = {
  ':last-of-type': {
    border: 'none',
  },
}

function SidebarSectionRef(
  { layout = 'vertical', children, grow = 0, ...props }: SidebarSectionProps,
  ref: Ref<any>
) {
  const isHorizontal = layout === 'horizontal'
  const childrenWithProps = Children.map(children, (child) =>
    isValidElement(child)
      ? cloneElement(child, { layout, ...(child as any).props })
      : child
  )

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
    >
      {childrenWithProps}
    </Flex>
  )
}

const SidebarSection = forwardRef(SidebarSectionRef)

export default SidebarSection
