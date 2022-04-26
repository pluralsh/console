import { ComponentType, Fragment, MouseEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box, BoxExtendedProps, Text, TextExtendedProps } from 'grommet'
import styled from 'styled-components'
import { normalizeColor } from 'grommet/utils'
import PropTypes from 'prop-types'

import { UserType } from '../types'

import Avatar from './Avatar'
import CollapseIcon from './icons/CollapseIcon'

type SidebarItem = {
  name?: string
  url?: string
  Icon?: ComponentType<any>
  onClick?: (event: MouseEvent) => any
  items?: SidebarItem[]
  matchedUrl?: RegExp
}

type SidebarProps = {
  items: SidebarItem[]
  activeUrl?: string
  user: UserType
}

type CollapsedProps = {
  collapsed: boolean
}

type DeployedProps = {
  deployed: boolean
}

const propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      url: PropTypes.string,
      Icon: PropTypes.elementType,
      onClick: PropTypes.func,
      items: PropTypes.array,
    })
  ),
  activeUrl: PropTypes.string,
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    imageUrl: PropTypes.string,
  }),
}

const Container = styled(Box)`
  transition: width 300ms ease;
`

const StyledLink = styled(Link)`
  text-decoration: none;
`

const Item = styled(Box)`
  color: ${({ theme }) => normalizeColor('text-strong', theme)};
  cursor: pointer;
  transition: background-color 150ms linear;
  user-select: none;

  &#active-item {
    background-color: ${({ theme }) => normalizeColor('background-light', theme)};
    font-weight: 600;
  }

  #sidebar-items:not(:hover) > &#active-item,
  #sidebar-items:not(:hover) > * > * > &#active-item,
  &:hover {
    background-color: ${({ theme }) => normalizeColor('background-light', theme)};
    font-weight: 600;
  }

  & > svg {
    flex-shrink: 0;
  }
`

const TransitionText = styled<ComponentType<CollapsedProps & TextExtendedProps>>(Text)`
  display: block;
  opacity: ${({ collapsed }) => collapsed ? 0 : 1};
  visibility: ${({ collapsed }) => collapsed ? 'hidden' : 'visible'};
  transition: opacity ${({ collapsed }) => collapsed ? 200 : 500}ms ease ${({ collapsed }) => collapsed ? 0 : 50}ms, visibility 200ms linear;
`

const TransitionTextNoSelect = styled(TransitionText)`
  user-select: none;
`

const CollapseIconContainer = styled<ComponentType<CollapsedProps & BoxExtendedProps>>(Box)`
  min-width: 24px;
  min-height: 24px;
  cursor: pointer;
  transition: all 300ms ease;
  transform: ${({ collapsed }) => collapsed ? 'rotate(180deg)' : 'rotate(0deg)'};
`

const DeployIconContainer = styled<ComponentType<CollapsedProps & DeployedProps & BoxExtendedProps>>(Box)`
  cursor: pointer;
  transition: all 300ms ease;
  transform: ${({ deployed }) => deployed ? 'rotate(0deg)' : 'rotate(180deg)'};
  opacity: ${({ collapsed }) => collapsed ? 0 : 1};
  visibility: ${({ collapsed }) => collapsed ? 'hidden' : 'visible'};
  transition: opacity ${({ collapsed }) => collapsed ? 200 : 500}ms ease ${({ collapsed }) => collapsed ? 0 : 100}ms, visibility 200ms linear, transform 300ms ease;
`

const ChildrenContainer = styled<ComponentType<DeployedProps & BoxExtendedProps>>(Box)`
  transition: height 300ms ease;

  & > * {
    transform: ${({ deployed }) => deployed ? 'translate(0px, 0px)' : 'translate(-4px, -4px)'};
    opacity: ${({ deployed }) => deployed ? 1 : 0};
    visibility: ${({ deployed }) => deployed ? 'visible' : 'hidden'};
    transition: opacity ${({ deployed }) => deployed ? 500 : 200}ms ease ${({ deployed }) => deployed ? 0 : 0}ms, visibility 200ms linear, transform 300ms ease;
  }
`

function Sidebar({
  items = [],
  activeUrl = '',
  user = {},
}: SidebarProps) {
  const sidebarBottomRef = useRef()
  const [collapsed, setCollapsed] = useState(false)
  const [deployedId, setDeployedId] = useState(activeUrl ? getIdForUrl(items, activeUrl) : null)
  const [deployedIdBeforeCollapse, setDeployedIdBeforeCollapse] = useState(deployedId)
  const [childrenHeights, setChildrenHeights] = useState({})
  const [sidebarContentMaxHeight, setSidebarcontentMaxHeight] = useState('100%')

  const activeId = getIdForUrl(items, activeUrl)

  useEffect(() => {
    setContentHeight()

    window.addEventListener('resize', setContentHeight)

    return () => {
      window.removeEventListener('resize', setContentHeight)
    }
  }, [])

  useEffect(() => {
    const nextChildrenHeights = {}

    items
    .filter(({ items }) => Array.isArray(items) && items.length > 0)
    .forEach(item => {
      const id = getId(item)
      const element = document.getElementById(`sidebar-children-${id}`)
      const div = element.firstElementChild

      nextChildrenHeights[id] = div.clientHeight
    })

    setChildrenHeights(nextChildrenHeights)
  }, [items])

  function setContentHeight() {
    const current = sidebarBottomRef.current as any

    const bottomRect = current.getBoundingClientRect()
    const parentRect = current.parentElement.getBoundingClientRect()

    setSidebarcontentMaxHeight(`${parentRect.height - bottomRect.height - 24 - 16}px`)
  }

  function toggleCollapsed() {
    setCollapsed(!collapsed)

    if (!collapsed) {
      setDeployedIdBeforeCollapse(deployedId)
      setDeployedId(null)
    }
    else {
      setDeployedId(deployedIdBeforeCollapse)
    }
  }

  function handleDeployItem(id: string) {
    setDeployedId(deployedId === id ? null : id)
  }

  function getIdForUrl(items: SidebarItem[], url: string): string | null {
    for (const item of items) {
      if (item.url === url || (item.matchedUrl instanceof RegExp && item.matchedUrl.test(url))) return getId(item)

      if (Array.isArray(item.items) && item.items.length > 0) {
        const id = getIdForUrl(item.items, url)

        if (id) return id
      }
    }

    return null
  }

  function isDeployedWithActiveChild(item: SidebarItem) {
    return activeId && item && Array.isArray(item.items) && item.items.some(x => getId(x) === activeId)
  }

  function isTopLevelItem(item: SidebarItem) {
    return items.some(x => x === item)
  }

  function isTopLevelActive(item: SidebarItem) {
    return isTopLevelItem(item) && isDeployedWithActiveChild(item)
  }

  function getId(item: SidebarItem) {
    return `${item.url}___@@@___${item.name}`
  }

  function renderItems(items: SidebarItem[], marginLeft = 0) {
    return items.map(item => {
      const id = getId(item)
      const { name, url, Icon, items, onClick } = item
      const hasChildren = Array.isArray(items) && items.length > 0

      const itemNode = (
        <Item
          id={(collapsed && isTopLevelActive(item)) || activeId === id ? 'active-item' : ''}
          direction="row"
          align="center"
          height="40px"
          round="4px"
          margin={{ left: `${marginLeft}px` }}
          pad={{ left: '12px' }}
          color="text-strong"
          overflow="hidden"
          onClick={(event: MouseEvent) => {
            if (hasChildren || isTopLevelItem(item)) handleDeployItem(id)
            if (typeof onClick === 'function') onClick(event)
          }}
          flex={{ shrink: 0 }}
        >
          {Icon ? (
            <Icon
              size={14}
              color="text-strong"
            />
          ) : (
            <span style={{ width: 14 }} />
          )}
          <TransitionText
            truncate
            collapsed={collapsed}
            size="small"
            margin={{ left: '16px' }}
          >
            {name}
          </TransitionText>
          {hasChildren && (
            <>
              <Box flex="grow" />
              <DeployIconContainer
                collapsed={collapsed}
                deployed={deployedId === id}
                align="center"
                justify="center"
                flex={{ shrink: 0 }}
              >
                <CollapseIcon
                  color="text-xweak"
                  size={6}
                />
              </DeployIconContainer>
              <Box width="16px" />
            </>
          )}
        </Item>
      )

      return (
        <Fragment key={id}>
          {url && !isDeployedWithActiveChild(item) ? wrapLink(itemNode, url) : itemNode}
          {hasChildren && (
            <ChildrenContainer
              id={`sidebar-children-${id}`}
              deployed={deployedId === id}
              height={`${deployedId === id ? childrenHeights[id] || 0 : 0}px`}
              overflow="hidden"
              flex={{ shrink: 0 }}
            >
              <div>
                {renderItems(items, marginLeft + 12)}
              </div>
            </ChildrenContainer>
          )}
        </Fragment>
      )
    })
  }

  function wrapLink(node: ReactNode, url: string) {
    return (
      <StyledLink to={url}>
        {node}
      </StyledLink>
    )
  }

  return (
    <Container
      width={`${collapsed ? 74 : 256 - 32}px`}
      background="background-front"
      border={{
        color: 'border',
        size: 'small',
        side: 'right',
      }}
      pad="24px 0px 16px 16px"
      flex={{ grow: 0, shrink: 0 }}
    >
      <Box
        overflow={{ vertical: 'auto' }}
        flex="grow"
        style={{ maxHeight: sidebarContentMaxHeight, height: sidebarContentMaxHeight }}
      >
        <Box
          id="sidebar-items"
          pad={{ right: '16px' }}
        >
          {renderItems(items)}
        </Box>
      </Box>
      <Box
        ref={sidebarBottomRef}
        flex={{ grow: 0, shrink: 0 }}
      >
        <Box
          direction="row"
          align="center"
          overflow="hidden"
          margin={{ top: '16px' }}
        >
          <CollapseIconContainer
            collapsed={collapsed}
            background="background-light"
            round="full"
            align="center"
            justify="center"
            width="24px"
            height="24px"
            onClick={toggleCollapsed}
          >
            <CollapseIcon
              color="text-xweak"
              size={6}
            />
          </CollapseIconContainer>
          <TransitionTextNoSelect
            collapsed={collapsed}
            size="small"
            color="text-xweak"
            margin={{ left: '16px' }}
          >
            Collapse
          </TransitionTextNoSelect>
        </Box>
        <Box
          direction="row"
          align="center"
          margin={{ top: '16px' }}
        >
          <Avatar
            name={user.name}
            imageUrl={user.imageUrl}
          />
          <Box pad={{ left: '8px' }}>
            <TransitionText
              collapsed={collapsed}
              truncate
              weight="bold"
              size="small"
              color="text-strong"
            >
              {user.name}
            </TransitionText>
            <TransitionText
              collapsed={collapsed}
              truncate
              size="xsmall"
              color="text-xweak"
            >
              {user.email}
            </TransitionText>
          </Box>
        </Box>
      </Box>
    </Container>
  )
}

Sidebar.propTypes = propTypes

export default Sidebar
