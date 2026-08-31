import {
  type ComponentProps,
  type Dispatch,
  type Key,
  type MutableRefObject,
  type ReactElement,
  type SetStateAction,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  ArrowRightIcon,
  CaretRightIcon,
  usePrevious,
} from '@pluralsh/design-system'
import NextLink from 'next/link'
import { useRouter } from 'next/router'

import classNames from 'classnames'
import { animated, useSpring } from 'react-spring'
import useMeasure from 'react-use-measure'
import styled, { useTheme } from 'styled-components'

import scrollIntoContainerView from '../utils/scrollIntoContainerView'
import { getBarePathFromPath, removeTrailingSlashes } from '../utils/text'

import type { MenuId, NavItem, NavMenu } from '../NavData'

export type SideNavProps = {
  navData: NavMenu
  desktop: boolean
  padTop?: boolean
  hide?: boolean
  menuId?: Key
  setMenuId: Dispatch<SetStateAction<MenuId>>
}

const NavContext = createContext<{
  optimisticPathname: null | string
  scrollRef: MutableRefObject<HTMLDivElement | null>
  desktop: boolean
  setMenuId: Dispatch<SetStateAction<MenuId>>
}>({
  optimisticPathname: null,
  scrollRef: { current: null },
  desktop: false,
  setMenuId: () => {},
})

const KeyboardNavContext = createContext<{
  keyboardNavigable: boolean
}>({
  keyboardNavigable: true,
})

const StyledLink = styled(NextLink as any)<{
  $desktop: boolean
}>(({ $desktop, theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  cursor: 'pointer',
  flexGrow: 1,
  flexShrink: 1,
  margin: 0,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
  ...theme.partials.text.body2,
  textDecoration: 'none',
  color: theme.colors['text-light'],
  '.iconRight': {
    display: 'flex',
    justifyContent: 'right',
    flexGrow: 1,
  },
  '&:hover': {
    color: theme.colors.text,
  },
  '&:focus, &:focus-visible': {
    outline: 'none',
    boxShadow: 'none',
  },
  '&:focus-visible::after': {
    borderStartStartRadius: theme.borderRadiuses.medium,
    borderEndStartRadius: theme.borderRadiuses.medium,
    borderStartEndRadius: $desktop ? 0 : theme.borderRadiuses.medium,
    borderEndEndRadius: $desktop ? 0 : theme.borderRadiuses.medium,
    ...theme.partials.focus.insetAbsolute,
  },
}))

type LinkBaseProps = Partial<ComponentProps<typeof StyledLink>> & {
  iconLeft?: ReactElement
  iconRight?: ReactElement
}

const LinkBase = forwardRef<HTMLAnchorElement, LinkBaseProps>(
  ({ className, children, iconLeft, iconRight, href, ...props }, ref) => {
    const { keyboardNavigable } = useContext(KeyboardNavContext)
    const { desktop } = useContext(NavContext)
    const content = (
      <StyledLink
        href={href}
        className={className}
        $desktop={desktop}
        tabIndex={keyboardNavigable ? 0 : -1}
        ref={ref}
        {...props}
      >
        {iconLeft && iconLeft}
        {children}
        <div className="iconRight">{iconRight && iconRight}</div>
      </StyledLink>
    )

    return content
  }
)

const CaretButton = styled(
  ({ isOpen = false, mode: _mode, className, ...props }) => {
    const { keyboardNavigable } = useContext(KeyboardNavContext)
    const [showHoverState, setShowHoverState] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const wasOpen = usePrevious(isOpen)

    useEffect(() => {
      if (wasOpen !== isOpen) {
        if (isHovered) setShowHoverState(false)
      }
    }, [wasOpen, isOpen, isHovered])

    return (
      <button
        tabIndex={keyboardNavigable ? 0 : -1}
        type="button"
        className={classNames(className, { showHoverState })}
        aria-label={isOpen ? 'Collapse' : 'Expand'}
        onMouseEnter={() => {
          setShowHoverState(true)
          setIsHovered(true)
        }}
        onMouseLeave={() => {
          setShowHoverState(true)
          setIsHovered(false)
        }}
        {...props}
      >
        {_mode === 'menu' ? (
          <ArrowRightIcon className="icon" />
        ) : (
          <CaretRightIcon className="icon" />
        )}
      </button>
    )
  }
)(({ theme, isOpen, mode = 'subsection' }) => ({
  ...theme.partials.reset.button,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingRight: theme.spacing.large,
  paddingLeft: theme.spacing.medium,
  cursor: 'pointer',
  color: theme.colors['text-light'],
  transition: 'color 0.1s ease',
  position: 'relative',
  '&:focus-visible::before': {
    ...theme.partials.focus.insetAbsolute,
    borderRadius: theme.borderRadiuses.medium,
    top: theme.spacing.xsmall,
    left: theme.spacing.xsmall,
    right: theme.spacing.xsmall + theme.spacing.xsmall,
    bottom: theme.spacing.xsmall,
  },
  ...(mode === 'subsection'
    ? {
        '.icon': {
          transform: `rotate(${isOpen ? 90 : 0}deg)`,
          transition: 'all 0.175s cubic-bezier(.31,1.49,.64,1)',
        },
        '&.showHoverState:hover .icon': {
          transform: isOpen ? 'rotate(-45deg)' : 'rotate(45deg)',
          transitionDuration: '0.2s',
        },
      }
    : {}),
  ...(mode === 'menu'
    ? {
        '.icon': {
          transform: `translateX(${isOpen ? 20 : 0}%)`,
          transition: 'all 0.175s cubic-bezier(.31,1.49,.64,1)',
        },
        '&.showHoverState:hover .icon': {
          transform: 'translateX(30%)',
        },
      }
    : {}),
}))

function NavLinkUnstyled({
  className,
  isSubSection = false,
  isOpen = false,
  childIsSelected = false,
  onToggleOpen,
  icon,
  desktop: _,
  toMenu,
  ...props
}: {
  isSubSection?: boolean
  isOpen?: boolean
  childIsSelected: boolean
  icon?: ReactElement
  desktop: boolean
  toMenu: MenuId
  onToggleOpen?: () => void
} & Partial<ComponentProps<typeof StyledLink>>) {
  const href = useMemo(() => removeTrailingSlashes(props.href), [props.href])
  const { scrollRef, setMenuId, ...navContext } = useContext(NavContext)
  const optimisticPathname = removeTrailingSlashes(
    navContext.optimisticPathname
  )
  const isSelectedOptimistic = useMemo(
    () => optimisticPathname === href,
    [optimisticPathname, href]
  )
  const liRef = useRef<HTMLLIElement>(null)
  const theme = useTheme()

  // Scroll into view gets interrupted by page transitions, so we only start
  // scrolling when the actual pathname changes instead of using optimisticPathname
  // like everything else
  const pathname = removeTrailingSlashes(useRouter().pathname)
  const isSelected = useMemo(() => pathname === href, [pathname, href])
  const wasSelected = usePrevious(isSelected)

  useEffect(() => {
    if (isSelected && !wasSelected && liRef?.current && scrollRef?.current) {
      scrollIntoContainerView(liRef.current, scrollRef.current, {
        behavior: 'smooth',
        block: 'start',
        blockOffset: theme.spacing.xlarge,
        preventIfVisible: true,
      })
    }
  }, [isSelected, wasSelected, scrollRef, liRef, theme.spacing.xlarge])

  const toMenuOnClick = () => setMenuId(toMenu)

  return (
    <li
      ref={liRef}
      className={classNames(className, {
        selected: isSelectedOptimistic,
        selectedSecondary: childIsSelected && !isSelectedOptimistic,
      })}
    >
      <LinkBase
        iconLeft={icon}
        onClick={() => {
          if (isSelected && onToggleOpen) {
            onToggleOpen()
          }
          if (toMenu) {
            toMenuOnClick()
          }
        }}
        {...props}
      />
      {(isSubSection || toMenu) && (
        <CaretButton
          isOpen={isOpen && !toMenu}
          mode={toMenu ? 'menu' : 'subsection'}
          onClick={toMenu ? toMenuOnClick : onToggleOpen}
        />
      )}
    </li>
  )
}

const NavLink = styled(NavLinkUnstyled)(({ desktop, theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  position: 'relative',
  alignItems: 'stretch',
  justifyContent: 'space-between',
  margin: 0,
  padding: 0,
  listStyle: 'none',

  borderStartStartRadius: theme.borderRadiuses.medium,
  borderEndStartRadius: theme.borderRadiuses.medium,
  borderStartEndRadius: desktop ? 0 : theme.borderRadiuses.medium,
  borderEndEndRadius: desktop ? 0 : theme.borderRadiuses.medium,

  '&:hover': {
    backgroundColor: theme.colors['fill-one-hover'],
  },
  '&.selectedSecondary': {
    backgroundColor: theme.colors['fill-one-selected'],
    '&:hover': { backgroundColor: theme.colors['fill-one-selected'] },
  },
  '&.selected': {
    backgroundColor: theme.colors['action-primary'],
    '&:hover': { backgroundColor: theme.colors['action-primary-hover'] },
  },
}))

export const TopHeading = styled.h6(({ theme }) => ({
  margin: 0,
  paddingLeft: theme.spacing.medium,
  paddingTop: theme.spacing.xsmall,
  paddingBottom: theme.spacing.xsmall,
  ...theme.partials.marketingText.label,
}))

const TopSection = styled(({ title, children, ...props }) => (
  <div {...props}>
    <TopHeading>{title}</TopHeading>
    {children}
  </div>
))(({ theme }) => ({
  display: 'block',
  margin: 0,
  padding: 0,
  listStyle: 'none',
  ':not(:first-child)': {
    marginTop: theme.spacing.large,
  },
}))

function isPathnameInSections(
  routerPathname,
  sections: NavItem[] | undefined,
  depth = 0
) {
  routerPathname = removeTrailingSlashes(routerPathname)
  for (const section of sections || []) {
    if (routerPathname === removeTrailingSlashes(section.href)) {
      return true
    }
    if (isPathnameInSections(routerPathname, section.sections, depth + 1)) {
      return true
    }
  }

  return false
}

const SubSectionsList = styled(
  forwardRef<
    HTMLUListElement,
    { sections: NavItem[]; indentLevel?: number; className?: string }
  >(({ className, sections, indentLevel = 0 }, ref) => {
    const pathname = useContext(NavContext).optimisticPathname

    return (
      <ul
        ref={ref}
        className={className}
      >
        {sections.map((subSection) => {
          const defaultOpen = isPathnameInSections(pathname, [subSection])

          return (
            <SubSection
              key={`${subSection.href || ''}-${subSection.title || ''}`}
              defaultOpen={defaultOpen}
              {...subSection}
              indentLevel={indentLevel + 1}
            />
          )
        })}
      </ul>
    )
  }) as any
)(({ theme, indentLevel }) => ({
  margin: 0,
  padding: 0,
  listStyle: 'none',
  ...(indentLevel
    ? {
        paddingLeft:
          indentLevel >= 2 ? theme.spacing.xsmall : theme.spacing.medium,
      }
    : {}),
}))

function SubSection({
  title,
  href,
  sections,
  icon,
  indentLevel = 1,
  defaultOpen = false,
  toMenu,
}: NavItem & { indentLevel?: number; defaultOpen: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const toggleOpen = useCallback(() => {
    setIsOpen(!isOpen)
  }, [isOpen])
  const [measureRef, { height }] = useMeasure()
  const prevHeight = usePrevious(height)

  const pathname = removeTrailingSlashes(
    useContext(NavContext).optimisticPathname
  )
  const prevPathname = usePrevious(pathname)
  const isSelected = useMemo(
    () => pathname === removeTrailingSlashes(href),
    [pathname, href]
  )

  useEffect(() => {
    if (
      prevPathname !== pathname &&
      isPathnameInSections(pathname, [{ href, sections }])
    ) {
      setIsOpen(true)
    }
  }, [prevPathname, pathname, isSelected, href, sections])

  const expand = useSpring({
    height: isOpen ? `${height}px` : '0px',
    immediate: !prevHeight,
    config: isOpen
      ? {
          mass: 0.6,
          tension: 280,
          velocity: 0.02,
        }
      : {
          mass: 0.6,
          tension: 400,
          velocity: 0.02,
          restVelocity: 0.1,
        },
  })

  const contextValue = useMemo(() => ({ keyboardNavigable: isOpen }), [isOpen])
  const { desktop } = useContext(NavContext)

  return (
    <>
      <NavLink
        isSubSection={!!sections}
        href={href}
        icon={icon}
        desktop={desktop}
        isOpen={isOpen && Array.isArray(sections) && sections?.length > 0}
        childIsSelected={defaultOpen}
        onToggleOpen={toggleOpen}
        toMenu={toMenu}
      >
        {title}
      </NavLink>
      {sections && (
        <animated.div
          className="sturf"
          style={{
            ...(prevHeight ? expand : { height: isOpen ? 'auto' : '0' }),
            overflow: 'hidden',
          }}
        >
          <KeyboardNavContext.Provider value={contextValue}>
            <SubSectionsList
              sections={sections}
              ref={measureRef as unknown as MutableRefObject<any>}
              indentLevel={indentLevel}
            />
          </KeyboardNavContext.Provider>
        </animated.div>
      )}
    </>
  )
}
const navLeftOffset = 1000

export const NavPositionWrapper = styled.nav(({ theme: _theme }) => ({
  position: 'sticky',
  height: 'calc(100vh - var(--top-nav-height))',
  top: 'var(--top-nav-height)',
  display: 'flex',
  flexDirection: 'column',
}))

const NavScrollContainer = styled.div<{
  $desktop: boolean
  $padTop: boolean
  $hide: boolean
}>(({ $desktop: desktop, $padTop: padTop, $hide: hide = false, theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  overflowY: 'auto',
  backgroundColor: theme.colors['fill-one'],
  borderRight: desktop ? theme.borders['fill-one'] : 'none',
  paddingBottom: `calc(${theme.spacing.xlarge}px + var(--menu-extra-bpad))`,
  paddingTop: padTop ? theme.spacing.large : 0,
  paddingRight: desktop ? 0 : theme.spacing.medium,
  paddingLeft: desktop ? 0 : theme.spacing.medium,
  marginLeft: desktop ? -navLeftOffset : 0,
  display: hide ? 'none' : 'block',
}))

const Nav = styled.nav<{ $desktop: boolean }>(
  ({ $desktop: desktop, theme: _theme }) => ({
    marginLeft: desktop ? navLeftOffset : 0,
  })
)

export function SideNav({
  navData,
  desktop,
  padTop = true,
  hide = false,
  menuId = '',
  setMenuId,
}: SideNavProps) {
  const router = useRouter()
  const [optimisticPathname, setOptimisticPathname] = useState<string | null>(
    null
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const contextValue = useMemo(
    () => ({
      scrollRef,
      desktop,
      setMenuId,
      optimisticPathname:
        optimisticPathname === null
          ? getBarePathFromPath(router.asPath)
          : optimisticPathname,
    }),
    [desktop, setMenuId, optimisticPathname, router.asPath]
  )

  useEffect(() => {
    if (!router?.events?.on) {
      return
    }
    const handleRouteChangeStart = (url) => {
      setOptimisticPathname(url)
    }
    const handleRouteChangeComplete = (_url) => {
      setOptimisticPathname(null)
    }
    const handleRouteChangeError = (_err, _url) => {
      setOptimisticPathname(null)
    }
    const handleHashChangeStart = (_url) => {
      console.debug('hashChangeStart', _url)
    }
    const handleHashChangeComplete = (_url) => {
      console.debug('handleHashChangeComplete', _url)
    }

    router.events.on('routeChangeStart', handleRouteChangeStart)
    router.events.on('routeChangeComplete', handleRouteChangeComplete)
    router.events.on('routeChangeError', handleRouteChangeError)
    router.events.on('hashChangeStart', handleHashChangeStart)
    router.events.on('hashChangeComplete', handleHashChangeComplete)

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart)
      router.events.off('routeChangeComplete', handleRouteChangeComplete)
      router.events.off('routeChangeError', handleRouteChangeError)
    }
  }, [router.events])

  return (
    <NavContext.Provider value={contextValue}>
      <NavScrollContainer
        key={menuId}
        ref={scrollRef}
        $desktop={desktop}
        $padTop={padTop}
        $hide={hide}
      >
        <Nav $desktop={desktop}>
          {(navData || []).map(({ title, sections }) => (
            <TopSection
              title={title}
              key={title}
            >
              {sections && <SubSectionsList sections={sections} />}
            </TopSection>
          ))}
        </Nav>
      </NavScrollContainer>
    </NavContext.Provider>
  )
}
