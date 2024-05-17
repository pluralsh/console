import { type MouseEvent } from 'react'

import { HamburgerMenuCollapseIcon, HamburgerMenuCollapsedIcon } from '../icons'

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
      {isExpanded ? (
        <HamburgerMenuCollapseIcon />
      ) : (
        <HamburgerMenuCollapsedIcon />
      )}
    </SidebarItem>
  )
}

// in case we want to animate it later
// const AnimatedHamburgerIcon = styled(HamburgerMenuCollapsedIcon)<{
//   isExpanded: boolean
// }>`
//   animation: ${() => flipAnimation} 0.1s;
//   transform: ${({ isExpanded }) => (isExpanded ? 'scaleX(-1)' : 'scaleX(1)')};
//   animation-direction: ${({ isExpanded }) =>
//     isExpanded ? 'normal' : 'reverse'};
// `

// const flipAnimation = keyframes`
//   0% {
//     transform: scaleX(1);
//   }
//   100% {
//     transform: scaleX(-1);
//   }
// `

export default SidebarExpandButton
