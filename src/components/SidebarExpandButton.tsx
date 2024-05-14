import { type MouseEvent } from 'react'

import { HamburgerMenuCollapseIcon, HamburgerMenuIcon } from '../icons'

import { useSidebar } from './Sidebar'
import SidebarItem from './SidebarItem'

function SidebarExpandButton() {
  const { setIsExpanded, isExpanded } = useSidebar()

  return (
    <SidebarItem
      tooltip="Expand"
      className="sidebar-expand"
      clickable
      expandedLabel="Collapse"
      onClick={(e: MouseEvent) => {
        e.stopPropagation()
        setIsExpanded((x: boolean) => !x)
      }}
    >
      {isExpanded ? <HamburgerMenuCollapseIcon /> : <HamburgerMenuIcon />}
    </SidebarItem>
  )
}

export default SidebarExpandButton
