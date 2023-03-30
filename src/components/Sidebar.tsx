import { Flex, FlexProps } from 'honorable'
import { Children, Ref, cloneElement, forwardRef, isValidElement } from 'react'

type SidebarLayout = 'vertical' | 'horizontal'
type SidebarProps = {
  layout?: SidebarLayout
} & FlexProps

function SidebarRef(
  { layout = 'vertical', children, ...props }: SidebarProps,
  ref: Ref<any>
) {
  const isHorizontal = layout === 'horizontal'
  const size = isHorizontal ? '56px' : '64px'
  const childrenWithProps = Children.map(children, (child) =>
    isValidElement(child)
      ? cloneElement(child, { layout, ...(child as any).props })
      : child
  )

  return (
    <Flex
      direction={isHorizontal ? 'row' : 'column'}
      grow={1}
      justify="flex-start"
      height={isHorizontal ? size : '100%'}
      width={isHorizontal ? '100%' : size}
      maxWidth={isHorizontal ? '100%' : size}
      minWidth={isHorizontal ? '100%' : size}
      backgroundColor="fill-zero"
      borderRight={isHorizontal ? '' : '1px solid border'}
      borderBottom={isHorizontal ? '1px solid border' : ''}
      overflowY="hidden"
      ref={ref}
      {...props}
    >
      {childrenWithProps}
    </Flex>
  )
}

const Sidebar = forwardRef(SidebarRef)

export default Sidebar
export type { SidebarLayout }
