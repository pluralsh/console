import { useOutsideClick } from 'honorable'
import { type ReactNode, useEffect, useRef } from 'react'

import styled from 'styled-components'

import { SIDEBAR_WIDTH, useSidebar } from './Sidebar'

export const SIDEBAR_EXPANDED_WIDTH = 180

function SidebarExpandWrapper({
  pathname,
  ...props
}: {
  pathname?: string
  children: ReactNode[]
}) {
  const { layout, isExpanded, setIsExpanded } = useSidebar()
  const isHorizontal = layout === 'horizontal'
  const ref = useRef(null)

  useOutsideClick(ref, () => {
    setIsExpanded(false)
  })

  useEffect(() => {
    setIsExpanded(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <Animated
      $isExpanded={isExpanded}
      $isHorizontal={isHorizontal}
      ref={ref}
      {...props}
    />
  )
}

export default SidebarExpandWrapper

const Animated = styled.div<{
  $isExpanded: boolean
  $isHorizontal: boolean
}>(({ theme, $isExpanded, $isHorizontal }) => ({
  display: 'flex',
  flexDirection: $isHorizontal ? 'row' : 'column',
  position: 'relative',
  alignItems: 'center',
  borderBottom: $isHorizontal ? '' : `1px solid ${theme.colors.border}`,
  gap: $isHorizontal ? theme.spacing.medium : theme.spacing.xsmall,
  borderRight: $isHorizontal ? undefined : `1px solid ${theme.colors.border}`,
  width: $isExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_WIDTH,
  minWidth: $isExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_WIDTH,
  maxWidth: $isExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_WIDTH,
  height: '100%',
  backgroundColor: 'inherit',
  transition: 'all 0.2s ease',
  zIndex: 10,
  '&:last-of-type': {
    borderBottom: 'none',
  },
}))
