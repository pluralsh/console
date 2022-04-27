// @ts-nocheck
import { ComponentType, Fragment, MouseEvent, ReactNode, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from '@emotion/styled'
import { Div, DivProps, P, useTheme } from 'honorable'
import PropTypes from 'prop-types'

import { UserType } from '../types'

import Avatar from './Avatar'
import CollapseIcon from './icons/CollapseIcon'

type SidebarItem = DivProps & {
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

const StyledLink = styled(Link)`
  text-decoration: none;
`

const Item = styled(Div)`
  color: ${({ theme }) => theme.utils.resolveColor('text-strong')};
  cursor: pointer;
  transition: background-color 150ms linear;
  user-select: none;

  &#active-item {
    background-color: ${({ theme }) => theme.utils.resolveColor('background-light')};
    font-weight: 600;
  }

  #sidebar-items:not(:hover) > &#active-item,
  #sidebar-items:not(:hover) > * > * > &#active-item,
  &:hover {
    background-color: ${({ theme }) => theme.utils.resolveColor('background-light')};
    font-weight: 600;
  }

  & > svg {
    flex-shrink: 0;
  }
`

function TransitionText({ collapsed, ...props }: any) {
  return (
    <P
      display="block"
      opacity={collapsed ? 0 : 1}
      visibility={collapsed ? 'hidden' : 'visible'}
      transition={`${collapsed ? 200 : 500}ms ease ${collapsed ? 0 : 50}ms, visibility 200ms linear`}
      {...props}
    />
  )
}

const ChildrenContainer = styled(Div)`
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
  ...props
}: SidebarProps) {
  const theme = useTheme()
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
          theme={theme}
          id={(collapsed && isTopLevelActive(item)) || activeId === id ? 'active-item' : ''}
          xflex="x4"
          height={40}
          borderRadius={4}
          ml={`${marginLeft}px`}
          pl="12px"
          color="text-strong"
          overflow="hidden"
          onClick={(event: MouseEvent) => {
            if (hasChildren || isTopLevelItem(item)) handleDeployItem(id)
            if (typeof onClick === 'function') onClick(event)
          }}
          flexShrink={0}
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
              <Div flex="grow" />
              <Div
                cursor="pointer"
                transform={`rotate(${deployedId === id ? 0 : 180}deg)`}
                opacity={collapsed ? 0 : 1}
                visibility={collapsed ? 'hidden' : 'visible'}
                transition={`opacity ${collapsed ? 200 : 500}ms ease ${collapsed ? 0 : 100}ms, visibility 200ms linear, transform 300ms ease`}
                xflex="x5"
                flexShrink={0}
              >
                <CollapseIcon
                  color="text-xweak"
                  size={6}
                />
              </Div>
              <Div width="16px" />
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
              height={deployedId === id ? childrenHeights[id] || 0 : 0}
              overflow="hidden"
              transition="height 300ms ease"
              flexShrink={0}
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
    <Div
      transition="width 300ms ease"
      width={collapsed ? 74 : 256 - 32}
      height="100%"
      backgroundColor="background-front"
      borderRight="1px solid border"
      pt={1.5}
      pr={1}
      pb={1}
      flexGrow={0}
      flexShrink={0}
      {...props}
    >
      <Div
        overflowY="auto"
        flexGrow={1}
        height={sidebarContentMaxHeight}
        maxHeight={sidebarContentMaxHeight}
      >
        <Div
          id="sidebar-items"
          pr={1}
        >
          {renderItems(items)}
        </Div>
      </Div>
      <Div
        ref={sidebarBottomRef}
        flexGrow={0}
        flexShrink={0}
      >
        <Div
          mt={1}
          xflex="x4"
          overflow="hidden"
        >
          <Div
            xflex="x5"
            width={24}
            height={24}
            minWidth={24}
            minHeight={24}
            cursor="pointer"
            transition="all 300ms ease"
            transform={collapsed ? 'rotate(180deg)' : 'rotate(0deg)'}
            backgroundColor="background-light"
            borderRadius={1000}
            onClick={toggleCollapsed}
          >
            <CollapseIcon
              color="text-xweak"
              size={6}
            />
          </Div>
          <TransitionText
            collapsed={collapsed}
            ml={1}
            userSelect="none"
            size="small"
            color="text-xweak"
          >
            Collapse
          </TransitionText>
        </Div>
        <Div
          mt={1}
          xflex="x4"
        >
          <Avatar
            name={user.name}
            imageUrl={user.imageUrl}
          />
          <Div pl={0.5}>
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
          </Div>
        </Div>
      </Div>
    </Div>
  )
}

Sidebar.propTypes = propTypes

export default Sidebar
