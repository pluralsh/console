import {
  Children,
  type ComponentProps,
  type Key,
  type MutableRefObject,
  type PropsWithChildren,
  type ReactElement,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react'
import classNames from 'classnames'
import { useSpring } from 'react-spring'
import useMeasure from 'react-use-measure'
import styled, { useTheme } from 'styled-components'
import { type ImmerReducer, useImmerReducer } from 'use-immer'
import { Div } from 'honorable'

import usePrevious from '../hooks/usePrevious'
import useUnmount from '../hooks/useUnmount'
import { CaretRightIcon } from '../icons'

import { useNavigationContext } from './contexts/NavigationContext'
import Tab, { TAB_INDICATOR_THICKNESS } from './Tab'
import { AnimatedDiv } from './AnimatedDiv'

export type SideNavProps = {
  desktop: boolean
  padTop?: boolean
  hide?: boolean
  menuId?: Key
}

const NavContext = createContext<{
  optimisticPathname: null | string
  scrollRef: MutableRefObject<HTMLDivElement | null>
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

const StyledLink = styled.a(({ theme }) => ({
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
    ...theme.partials.focus.insetAbsolute,
  },
}))

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
  children,
  ...props
}: {
  isSubSection?: boolean
  isOpen?: boolean
  activeSecondary: boolean
  icon?: ReactElement
  desktop: boolean
  active: boolean
  onClickCaret?: () => void
} & Partial<ComponentProps<typeof StyledLink>>) {
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
        onClick={(e) => {
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
        {...(props.href ? { as: Link } : {})}
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

const SubSectionsListWrap = styled.ul<{ indentLevel: number }>((_) => ({
  margin: 0,
  padding: 0,
  listStyle: 'none',
}))

function SubSectionsListRef(
  { className, children, ...props }: PropsWithChildren<{ className?: string }>,
  ref: MutableRefObject<any>
) {
  const navDepth = useContext(NavDepthContext)

  return (
    <SubSectionsListWrap
      indentLevel={navDepth}
      ref={ref}
      className={className}
      {...props}
    >
      <NavDepthContext.Provider value={navDepth + 1}>
        {children}
      </NavDepthContext.Provider>
    </SubSectionsListWrap>
  )
}

export const SubSectionsList = forwardRef(SubSectionsListRef)

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
  toMenu,
  onOpenChange,
  label,
  onClick,
  active,
  children,
  ...props
}: PropsWithChildren<Omit<ComponentProps<typeof NavLink>, 'isSubSection'>> & {
  indentLevel?: number
  loading?: boolean
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
        onClick={(e: Event) => {
          onClick?.(e)
          if (hasActiveDescendents) {
            setIsOpen(true)
          } else {
            toggleOpen()
          }
        }}
        onClickCaret={toggleOpen}
        toMenu={toMenu}
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
            <SubSectionsList
              ref={measureRef as unknown as MutableRefObject<any>}
            >
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
