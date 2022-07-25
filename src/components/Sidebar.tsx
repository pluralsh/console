import { Flex, FlexProps } from 'honorable'
import { Ref, forwardRef } from 'react'

type SidebarProps = FlexProps

function SidebarRef({ children, ...props }: SidebarProps, ref: Ref<any>) {
  const width = '64px'

  return (
    <Flex
      direction="column"
      grow={1}
      justify="start"
      height="100%"
      width={width}
      maxWidth={width}
      minWidth={width}
      backgroundColor="fill-zero"
      borderRight="1px solid border"
      overflowY="hidden"
      ref={ref}
      {...props}
    >
      {children}
    </Flex>
  )
}

const Sidebar = forwardRef(SidebarRef)
export default Sidebar
