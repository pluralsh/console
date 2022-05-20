import { ComponentType, Fragment, MouseEvent, ReactNode, Ref, forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import styled from '@emotion/styled'
import { A, Avatar, Div, DivProps, Flex, HonorableTheme, Img, P, useForkedRef, useTheme } from 'honorable'
import PropTypes from 'prop-types'

import CollapseIcon from './icons/CollapseIcon'
import LifePreserverIcon from './icons/LifePreserverIcon'
import ArrowTopRightIcon from './icons/ArrowTopRightIcon'
import HamburgerMenuIcon from './icons/HamburgerMenuIcon'
import HamburgerMenuCollapseIcon from './icons/HamburgerMenuCollapseIcon'

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
  userImageUrl?: string
  userName?: string
  userOrganization?: string
  supportUrl?: string
  onUserClick?: (event: MouseEvent) => void
}

const propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      url: PropTypes.string,
      Icon: PropTypes.any,
      onClick: PropTypes.func,
      items: PropTypes.array,
    })
  ),
  activeUrl: PropTypes.string,
  userImageUrl: PropTypes.string,
  userName: PropTypes.string,
  userOrganization: PropTypes.string,
  supportUrl: PropTypes.string,
  onUserClick: PropTypes.func,
}

const StyledLink = styled(Link)`
  text-decoration: none;
`

const Item = styled(Flex)`
  &#active-item {
    color: ${({ theme }) => (theme as HonorableTheme).utils.resolveColorString('text-strong')};
    background-color: ${({ theme }) => (theme as HonorableTheme).utils.resolveColorString('background-light')};
    font-weight: 600;
  }

  #sidebar-items:not(:hover) > &#active-item,
  #sidebar-items:not(:hover) > * > * > &#active-item,
  &:hover {
    color: ${({ theme }) => (theme as HonorableTheme).utils.resolveColorString('text-strong')};
    background-color: ${({ theme }) => (theme as HonorableTheme).utils.resolveColorString('background-light')};
  }

  & svg {
    flex-shrink: 0;
  }

  &:hover * {
    stroke: white;
  }
`

function TransitionText({ collapsed, ...props }: any) {
  return (
    <P
      display="block"
      opacity={collapsed ? 0 : 1}
      visibility={collapsed ? 'hidden' : 'visible'}
      transition={`opacity ${collapsed ? 200 : 500}ms ease, background-color ${collapsed ? 200 : 500}ms ease ${collapsed ? 0 : 50}ms, visibility 200ms linear, color 150ms linear`}
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

function SidebarRef({
  items = [],
  activeUrl = '',
  userImageUrl,
  userName,
  userOrganization,
  supportUrl,
  onUserClick = () => {},
  ...props
}: SidebarProps,
ref: Ref<any>
) {
  const activeItem = getItemForUrl(items, activeUrl)
  const activeId = getId(activeItem)
  const theme = useTheme()
  const sidebarRef = useRef<HTMLDivElement>()
  const sidebarTopRef = useRef<HTMLDivElement>()
  const sidebarBottomRef = useRef<HTMLDivElement>()
  const forkedRef = useForkedRef(ref, sidebarRef)
  const [collapsed, setCollapsed] = useState((activeItem?.items || []).length === 0)
  const [deployedId, setDeployedId] = useState(activeUrl ? activeId : null)
  const [deployedIdBeforeCollapse, setDeployedIdBeforeCollapse] = useState(deployedId)
  const [childrenHeights, setChildrenHeights] = useState({})
  const [sidebarContentMaxHeight, setSidebarcontentMaxHeight] = useState('100%')

  const getTopLevelItem = useCallback((item: SidebarItem) => {
    if (!item) return null

    if (items.some(x => x === item)) return item

    const parent = items.find(x => Array.isArray(x.items) && x.items.some(y => y === item))

    if (parent) return parent

    return null
  }, [items])

  const handleCollapse = useCallback((nextCollapsed: boolean) => {
    if (nextCollapsed === collapsed) return

    setCollapsed(nextCollapsed)

    if (nextCollapsed) {
      setDeployedIdBeforeCollapse(deployedId)
      setDeployedId(null)
    }
    else {
      setDeployedId(deployedIdBeforeCollapse)
    }
  }, [collapsed, deployedId, deployedIdBeforeCollapse])

  const handleDeployItem = useCallback((item: SidebarItem) => {
    if (!item) return

    const parentOrItem = getTopLevelItem(item)
    const id = getId(parentOrItem)

    if (id === deployedId) return

    setDeployedId(id)

    const isTopLevel = items.some(x => x === item)
    const hasChildren = (item.items || []).length > 0

    handleCollapse(isTopLevel && !hasChildren)
  }, [items, deployedId, handleCollapse, getTopLevelItem])

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

  useEffect(() => {
    handleDeployItem(activeItem)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl])

  function setContentHeight() {
    setSidebarcontentMaxHeight(`${sidebarRef.current.offsetHeight - sidebarBottomRef.current.offsetHeight - sidebarTopRef.current.offsetHeight - 16 - 2}px`)
  }

  function getItemForUrl(items: SidebarItem[], url: string): SidebarItem {
    for (const item of items) {
      if (item.url === url || (item.matchedUrl instanceof RegExp && item.matchedUrl.test(url))) return item

      if (Array.isArray(item.items)) {
        const found = getItemForUrl(item.items, url)

        if (found) return found
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
    if (!item) return null

    return `${item.url}___@@@___${item.name}`
  }

  function renderItems(items: SidebarItem[], marginLeft = 0) {
    return items.map(item => {
      const id = getId(item)
      const { name, url, Icon, items, onClick } = item
      const hasChildren = Array.isArray(items) && items.length > 0
      const isActive = (collapsed && isTopLevelActive(item)) || activeId === id

      const itemNode = (
        <Item
          theme={theme}
          id={isActive ? 'active-item' : ''}
          align="center"
          mb={0.25}
          mr={1}
          height={40}
          borderRadius={4}
          ml={`${marginLeft}px`}
          pl="12px"
          overflow="hidden"
          cursor="pointer"
          color={isActive ? 'text-strong' : 'text-light'}
          transition="background-color 150ms linear"
          userSelect="none"
          onClick={(event: MouseEvent) => {
            if ((hasChildren || isTopLevelItem(item)) && deployedId !== id) handleDeployItem(item)
            if (typeof onClick === 'function') onClick(event)
          }}
          flexShrink={0}
        >
          {Icon ? (
            <Icon
              size={14}
              color={isActive ? 'text-strong' : 'text-light'}
            />
          ) : (
            <span style={{ width: 14 }} />
          )}
          <TransitionText
            truncate
            collapsed={collapsed}
            body2
            ml={1}
          >
            {name}
          </TransitionText>
          {hasChildren && (
            <>
              <Div flexGrow={1} />
              <Flex
                align="center"
                justify="center"
                cursor="pointer"
                transform={`rotate(${deployedId === id ? 0 : 180}deg)`}
                opacity={collapsed ? 0 : 1}
                visibility={collapsed ? 'hidden' : 'visible'}
                transition={`opacity ${collapsed ? 200 : 500}ms ease ${collapsed ? 0 : 100}ms, visibility 200ms linear, transform 300ms ease`}
                flexShrink={0}
              >
                <CollapseIcon
                  color="text-xlight"
                  size={6}
                />
              </Flex>
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

  const MenuIcon = collapsed ? HamburgerMenuIcon : HamburgerMenuCollapseIcon

  return (
    <Div
      ref={forkedRef}
      transition="width 300ms ease"
      width={collapsed ? 74 : 256 - 32}
      height="100%"
      maxHeight="100%"
      overflow="hidden"
      borderRight="1px solid border"
      flexGrow={0}
      flexShrink={0}
      {...props}
    >
      <Flex
        ref={sidebarTopRef}
        py={1}
        pl={1.5}
        flexShrink={0}
        align="center"
        borderBottom="1px solid border"
      >
        <Img
          src="/plural-logo-white.svg"
          width={24}
        />
        <TransitionText
          ml={0.75}
          mb="-4px"
          collapsed={collapsed}
        >
          <Img
            src="/plural-logotype-white.svg"
            height={20}
          />
        </TransitionText>
      </Flex>
      <Div
        py={0.5}
        pl={1}
        flexGrow={1}
        flexShrink={1}
        overflowY="auto"
        height={sidebarContentMaxHeight}
        maxHeight={sidebarContentMaxHeight}
      >
        <Div id="sidebar-items">
          {renderItems(items)}
        </Div>
      </Div>
      <Div
        ref={sidebarBottomRef}
        mt={1}
        flexGrow={0}
        flexShrink={0}
        userSelect="none"
      >
        <Hoverer>
          {(hovered: boolean) => (
            <A
              href={supportUrl}
              target="_blank"
              borderBottom="1px solid border"
              display="block"
              _hover={{ textDecoration: 'none' }}
            >
              <Flex
                py={1}
                pl={1.75}
                align="center"
                overflow="hidden"
                cursor="pointer"
              >
                <LifePreserverIcon
                  size={16}
                  flexShrink={0}
                  color={hovered ? 'text-strong' : 'text-xlight'}
                />
                <TransitionText
                  collapsed={collapsed}
                  ml={1.25}
                  body2
                  flexGrow={1}
                  color={hovered ? 'text-strong' : 'text-xlight'}
                >
                  Support
                </TransitionText>
                <TransitionText
                  collapsed={collapsed}
                  ml={1}
                  mr={1}
                  flexShrink={0}
                  mb={-0.25}
                >
                  <ArrowTopRightIcon
                    size={22}
                    color={hovered ? 'text-strong' : 'text-xlight'}
                  />
                </TransitionText>
              </Flex>
            </A>
          )}
        </Hoverer>
        <Hoverer>
          {(hovered: boolean) => (
            <Flex
              py={1}
              pl={1.75}
              align="center"
              overflow="hidden"
              cursor="pointer"
              borderBottom="1px solid border"
              onClick={() => handleCollapse(!collapsed)}
            >
              <MenuIcon
                size={16}
                flexShrink={0}
                color={hovered ? 'text-strong' : 'text-xlight'}
              />
              <TransitionText
                collapsed={collapsed}
                ml={1.25}
                body2
                color={hovered ? 'text-strong' : 'text-xlight'}
              >
                Collapse
              </TransitionText>
            </Flex>
          )}
        </Hoverer>

        <Flex
          py={1}
          pl={1}
          align="center"
          cursor="pointer"
          onClick={onUserClick}
        >
          <Avatar
            src={userImageUrl}
            name={userName}
            flexShrink={0}
          />
          <Div
            ml={0.5}
            flexShrink={0}
          >
            <TransitionText
              collapsed={collapsed}
              color="text-strong"
              fontWeight={500}
              wordBreak="keep-all"
            >
              {userName}
            </TransitionText>
            {userOrganization && (
              <TransitionText
                mt={0.25}
                body3
                collapsed={collapsed}
                color="text-xlight"
                wordBreak="keep-all"
              >
                {userOrganization}
              </TransitionText>
            )}
          </Div>
        </Flex>
      </Div>
    </Div>
  )
}

const Sidebar = forwardRef(SidebarRef)

Sidebar.propTypes = propTypes

export default Sidebar

function Hoverer({ children }: any) {
  const rootRef = useRef<HTMLDivElement>()
  const [hovered, setHovered] = useState(false)

  return (
    <Div
      ref={rootRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children(hovered)}
    </Div>
  )
}
