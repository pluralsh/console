import { useSpring } from '@react-spring/web'
import classNames from 'classnames'
import { Div } from 'honorable'
import {
  Children,
  type ComponentProps,
  type ComponentPropsWithRef,
  type Key,
  type MouseEventHandler,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
  type RefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react'
import useMeasure from 'react-use-measure'
import styled, { useTheme } from 'styled-components'
import { type ImmerReducer, useImmerReducer } from 'use-immer'

import usePrevious from '../hooks/usePrevious'
import useUnmount from '../hooks/useUnmount'
import { CaretRightIcon } from '../icons'

import { AnimatedDiv } from './AnimatedDiv'
import { useNavigationContext } from './contexts/NavigationContext'
import Tab, { TAB_INDICATOR_THICKNESS } from './Tab'

export type SideNavProps = {
  desktop: boolean
  padTop?: boolean
  hide?: boolean
  menuId?: Key
}

const NavContext = createContext<{
  optimisticPathname: null | string
  scrollRef: RefObject<HTMLDivElement | null>
  desktop: boolean
}>({
  optimisticPathname: null,
  scrollRef: { current: null },
  desktop: false,
})

const NavDepthContext = createContext<number>(0)

const KeyboardNavContext = createContext<{
  keyboardNavigable: boolean
}>({
  keyboardNavigable: true,
})

const CaretButton = styled(
  ({
    isOpen = false,
    className,
    ...props
  }: {
    isOpen: boolean
    className?: string
  } & ComponentProps<'button'>) => {
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
        <CaretRightIcon className="icon" />
      </button>
    )
  }
)(({ theme, isOpen }) => ({
  ...theme.partials.reset.button,
  display: 'flex',
  alignSelf: 'stretch',
  alignItems: 'stretch',
  justifyContent: 'center',
  paddingRight: theme.spacing.medium,
  paddingLeft: theme.spacing.medium,
  marginRight: -TAB_INDICATOR_THICKNESS,
  cursor: 'pointer',
  color: theme.colors['text-light'],
  transition: 'color 0.1s ease',
  position: 'relative',
  '&:focus-visible::before': {
    ...theme.partials.focus.insetAbsolute,
    borderRadius: theme.borderRadiuses.medium,
    top: theme.spacing.xsmall,
    left: theme.spacing.xsmall,
    right: theme.spacing.xsmall,
    bottom: theme.spacing.xsmall,
  },
  '.icon': {
    transform: `rotate(${isOpen ? 90 : 0}deg)`,
    transition: 'all 0.175s cubic-bezier(.31,1.49,.64,1)',
  },
  '&.showHoverState:hover .icon': {
    transform: isOpen ? 'rotate(-45deg)' : 'rotate(45deg)',
    transitionDuration: '0.2s',
  },
}))

const BareLi = styled.li((_) => ({
  margin: 0,
  padding: 0,
  listStyle: 'none',
}))

function NavLink({
  isSubSection = false,
  isOpen = false,
  active,
  activeSecondary = false,
  onClick,
  onClickCaret,
  icon,
  href,
  children,
  ...props
}: {
  isSubSection?: boolean
  isOpen?: boolean
  activeSecondary: boolean
  icon?: ReactElement<any>
  href?: string
  desktop: boolean
  active: boolean
  onClickCaret?: () => void
} & ComponentProps<typeof Tab>) {
  const { Link } = useNavigationContext()
  const depth = useContext(NavDepthContext)
  const theme = useTheme()

  return (
    <BareLi>
      <Tab
        active={active}
        activeSecondary={activeSecondary}
        vertical
        iconLeft={icon}
        onClick={(e: MouseEventHandler<HTMLDivElement>) => {
          onClick(e)
        }}
        width="100%"
        innerProps={{
          display: 'flex',
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
        }}
        textDecoration="none"
        {...(href ? { as: Link, href } : {})}
        {...props}
      >
        <Div
          flexGrow={1}
          paddingTop={theme.spacing.xsmall}
          paddingBottom={theme.spacing.xsmall}
          paddingLeft={(depth + 1) * theme.spacing.medium}
          paddingRight={isSubSection ? 0 : theme.spacing.medium}
        >
          {children}
        </Div>
        {isSubSection && (
          <CaretButton
            isOpen={isOpen}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onClickCaret()
            }}
          />
        )}
      </Tab>
    </BareLi>
  )
}

export const TopHeading = styled.h6(({ theme }) => ({
  margin: 0,
  paddingLeft: theme.spacing.medium,
  paddingTop: theme.spacing.xsmall,
  paddingBottom: theme.spacing.xsmall,
  ...theme.partials.marketingText.label,
}))

const SubSectionsListWrap = styled.ul<{ $indentLevel: number }>((_) => ({
  margin: 0,
  padding: 0,
  listStyle: 'none',
}))

function SubSectionsList({
  children,

  ...props
}: ComponentPropsWithRef<'ul'>) {
  const navDepth = useContext(NavDepthContext)

  return (
    <SubSectionsListWrap
      $indentLevel={navDepth}
      {...props}
    >
      <NavDepthContext.Provider value={navDepth + 1}>
        {children}
      </NavDepthContext.Provider>
    </SubSectionsListWrap>
  )
}

const activeStatesReducer: ImmerReducer<
  Record<string, boolean>,
  { id: string; value: boolean }
> = (activeStates, { value, id }) => {
  if (!value) {
    delete activeStates[id]
  } else {
    activeStates[id] = true
  }
}

const NavEntryContext = createContext<{
  setIsActiveDescendant: (arg: { id: string; value: boolean }) => void
}>({ setIsActiveDescendant: () => {} })

const useActiveStates = () => {
  const [activeStates, setActiveDescendant] = useImmerReducer(
    activeStatesReducer,
    {}
  )

  return {
    setActiveState: setActiveDescendant,
    hasActiveDescendents:
      Object.entries(activeStates).findIndex(([_, value]) => !!value) >= 0,
  }
}

export function TreeNavEntry({
  href,
  icon,
  onOpenChange,
  label,
  onClick,
  active,
  children,
  ...props
}: Partial<ComponentProps<typeof NavLink>> & {
  indentLevel?: number
  loading?: boolean
  onOpenChange?: (open: boolean) => void
  label?: ReactNode
}) {
  const id = useId()
  const { hasActiveDescendents, setActiveState } = useActiveStates()
  const { setIsActiveDescendant } = useContext(NavEntryContext)
  const prevHasActiveDescendents = usePrevious(hasActiveDescendents)
  const [isOpen, setIsOpen] = useState(hasActiveDescendents)
  const navEntryContextVal = useMemo(
    () => ({ setIsActiveDescendant: setActiveState }),
    [setActiveState]
  )

  useEffect(() => {
    setIsActiveDescendant({ id, value: active || hasActiveDescendents })
  }, [active, hasActiveDescendents, id, setIsActiveDescendant])

  useUnmount(() => {
    setIsActiveDescendant({ id, value: false })
  })

  const changeOpen = useCallback(
    (open: boolean) => {
      if (open !== isOpen) {
        setIsOpen(open)
        onOpenChange?.(open)
      }
    },
    [isOpen, onOpenChange]
  )
  const toggleOpen = useCallback(() => {
    changeOpen(!isOpen)
  }, [changeOpen, isOpen])
  const [measureRef, { height }] = useMeasure()
  const prevHeight = usePrevious(height)

  useEffect(() => {
    if (
      hasActiveDescendents &&
      hasActiveDescendents !== prevHasActiveDescendents
    ) {
      changeOpen(true)
    }
  }, [changeOpen, hasActiveDescendents, prevHasActiveDescendents])

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

  const hasSections = children && Children.count(children) > 0

  return (
    <NavEntryContext.Provider value={navEntryContextVal}>
      <NavLink
        isSubSection={hasSections}
        href={href}
        icon={icon}
        desktop={desktop}
        isOpen={isOpen && hasSections}
        active={active && !hasActiveDescendents}
        activeSecondary={hasActiveDescendents}
        onClick={(e: MouseEventHandler<HTMLAnchorElement>) => {
          onClick?.(e)
          if (hasActiveDescendents) {
            setIsOpen(true)
          } else {
            toggleOpen()
          }
        }}
        onClickCaret={toggleOpen}
        {...props}
      >
        {label}
      </NavLink>
      {Children.count(children) > 0 && (
        <AnimatedDiv
          style={{
            ...(prevHeight ? expand : { height: isOpen ? 'auto' : '0' }),
            overflow: 'hidden',
          }}
        >
          <KeyboardNavContext.Provider value={contextValue}>
            <SubSectionsList ref={measureRef as unknown as RefObject<any>}>
              {children}
            </SubSectionsList>
          </KeyboardNavContext.Provider>
        </AnimatedDiv>
      )}
    </NavEntryContext.Provider>
  )
}

export const NavPositionWrapper = styled.nav(({ theme: _theme }) => ({
  position: 'sticky',
  height: 'calc(100vh - var(--top-nav-height))',
  top: 'var(--top-nav-height)',
  display: 'flex',
  flexDirection: 'column',
}))

export function TreeNav({ children }: PropsWithChildren) {
  return (
    <NavDepthContext.Provider value={0}>
      <div role="navigation">{children}</div>
    </NavDepthContext.Provider>
  )
}
