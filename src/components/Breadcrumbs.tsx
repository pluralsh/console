import {
  type MutableRefObject,
  type ReactNode,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { Nav, type NavProps } from 'honorable'
import styled from 'styled-components'
import classNames from 'classnames'
import { SwitchTransition, Transition } from 'react-transition-group'

import useResizeObserver from '../hooks/useResizeObserver'
import usePrevious from '../hooks/usePrevious'

import { Select } from './Select'
import { ListBoxItem } from './ListBoxItem'
import { useNavigationContext } from './contexts/NavigationContext'
import {
  type Breadcrumb,
  BreadcrumbsContext,
} from './contexts/BreadcrumbsContext'
import { SetInert } from './SetInert'

function getCrumbKey(crumb: Breadcrumb) {
  const maybeKey = crumb?.key

  return typeof maybeKey === 'string'
    ? maybeKey
    : `${typeof crumb.label === 'string' ? crumb.label : crumb.textValue}-${
        crumb.url
      }`
}

const CrumbSeparator = styled(({ className }: { className?: string }) => (
  <div
    className={className}
    aria-hidden
  >
    /
  </div>
))(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-input-disabled'],
}))

function CrumbLink({
  crumb,
  isLast = true,
}: {
  crumb: Breadcrumb
  isLast?: boolean
}) {
  const { Link } = useNavigationContext()

  return (
    <CrumbLinkWrap {...(isLast ? { 'aria-current': 'page' } : {})}>
      <CrumbLinkText className={classNames({ isLast })}>
        {isLast || typeof crumb.url !== 'string' ? (
          crumb.label
        ) : (
          <Link href={crumb.url}>{crumb.label}</Link>
        )}
      </CrumbLinkText>
      {!isLast && <CrumbSeparator />}
    </CrumbLinkWrap>
  )
}

const CrumbLinkWrap = styled.li(({ theme }) => ({
  ...theme.partials.reset.li,
  display: 'flex',
  flexDirection: 'row',
  gap: theme.spacing.small,
}))

const CrumbLinkText = styled.span(({ theme }) => ({
  whiteSpace: 'nowrap',
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  '&.isLast': {
    color: theme.colors.text,
  },
  'a:any-link': {
    textDecoration: 'none',
    color: theme.colors['text-xlight'],
    cursor: 'pointer',
    '&:focus, &:focus-visible': {
      outline: 'none',
    },
    '&:focus-visible': {
      textDecoration: 'underline',
      textDecorationColor: theme.colors['border-outline-focused'],
    },
    '&:hover': {
      color: theme.colors.text,
      textDecoration: 'underline',
    },
  },
}))

const CrumbSelectTriggerUnstyled = forwardRef<any, any>(
  (
    {
      className,
      isOpen: _isOpen,
      ...props
    }: { className?: string; isOpen?: boolean },
    ref
  ) => (
    <div
      className={className}
      ref={ref}
      {...props}
    >
      ...
    </div>
  )
)

const CrumbSelectTrigger = styled(CrumbSelectTriggerUnstyled)(({ theme }) => ({
  ...theme.partials.text.caption,
  cursor: 'pointer',
  color: theme.colors['text-xlight'],
  '&:focus, &:focus-visible': {
    outline: 'none',
  },
  '&:focus-visible': {
    textDecoration: 'underline',
    textDecorationColor: theme.colors['border-outline-focused'],
  },
}))

function CrumbSelect({
  breadcrumbs,
  isLast,
  isDisabled = false,
}: {
  breadcrumbs: Breadcrumb[]
  isLast: boolean
  isDisabled?: boolean
}) {
  const { useNavigate } = useNavigationContext()
  const navigate = useNavigate()

  return (
    <CrumbLinkWrap>
      <Select
        label="More"
        isDisabled={isDisabled}
        selectedKey={null}
        onSelectionChange={(key) => {
          const url = breadcrumbs[key as number]?.url

          if (url) {
            navigate(url)
          }
        }}
        placement="left"
        triggerButton={<CrumbSelectTrigger />}
        width="180px"
      >
        {breadcrumbs.map((crumb) => {
          const textValue = crumb.textValue
            ? crumb.textValue
            : typeof crumb.label === 'string'
            ? crumb.label
            : null

          return (
            <ListBoxItem
              key={getCrumbKey(crumb)}
              label={crumb.label}
              {...(textValue ? { textValue } : {})}
            />
          )
        })}
      </Select>
      {!isLast && <CrumbSeparator />}
    </CrumbLinkWrap>
  )
}

enum CrumbListVariant {
  heightlessHidden,
  normal,
}
const CrumbListSC = styled.ol<{
  $variant: CrumbListVariant
}>(({ theme, $variant }) => ({
  ...theme.partials.reset.list,
  display: 'flex',
  flexDirection: 'row',
  gap: theme.spacing.small,
  maxWidth: 'max-content',
  ...($variant === CrumbListVariant.heightlessHidden
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 0,
        opacity: 0,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        clipPath: 'inset(50%)',
        pointerEvents: 'none',
      }
    : {}),
}))

function CrumbListRef(
  {
    breadcrumbs,
    maxLength,
    visibleListId,
  }: {
    breadcrumbs: Breadcrumb[]
    maxLength: number
    visibleListId?: string
  },
  ref: MutableRefObject<any>
) {
  const id = useId()

  if (breadcrumbs?.length < 1) {
    return null
  }
  maxLength = Math.min(maxLength, breadcrumbs.length)
  const variant =
    visibleListId !== id
      ? CrumbListVariant.heightlessHidden
      : CrumbListVariant.normal

  const head = maxLength > 1 ? [breadcrumbs[0]] : []
  const middle = breadcrumbs.slice(
    head.length,
    breadcrumbs.length + head.length - maxLength
  )
  const tail = breadcrumbs.slice(
    breadcrumbs.length + head.length - maxLength,
    breadcrumbs.length
  )
  const isDisabled = variant === CrumbListVariant.heightlessHidden

  return (
    <SetInert inert={isDisabled}>
      <CrumbListSC
        id={id}
        ref={ref}
        $variant={variant}
        {...{ [CRUMB_LIST_ATTR]: '' }}
        aria-hidden={isDisabled}
      >
        {head.map((headCrumb) => (
          <CrumbLink
            key={getCrumbKey(headCrumb)}
            crumb={headCrumb}
            isLast={tail.length === 0}
          />
        ))}
        {middle.length > 0 && (
          <CrumbSelect
            breadcrumbs={middle}
            isLast={tail.length === 0}
          />
        )}
        {tail.map((crumb, i) => (
          <CrumbLink
            key={getCrumbKey(crumb)}
            crumb={crumb}
            isLast={i === tail.length - 1}
          />
        ))}
      </CrumbListSC>
    </SetInert>
  )
}

const CrumbList = forwardRef(CrumbListRef)

const transitionStyles = {
  entering: { opacity: 0, height: 0 },
  entered: { opacity: 1 },
  exiting: { display: 'none' },
  exited: { display: 'none' },
}

type BreadcrumbPropsBase = {
  minLength?: number
  maxLength?: number
  collapsible?: boolean
  breadcrumbs?: Breadcrumb[]
}
type BreadcrumbsProps = BreadcrumbPropsBase

const DynamicBreadcrumbsSC = styled.div((_) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
}))
const CRUMB_LIST_ATTR = 'data-crumblist' as const

export function DynamicBreadcrumbs({
  minLength = 0,
  maxLength = Infinity,
  collapsible = true,
  breadcrumbs,
  wrapperRef: transitionRef,
  ...props
}: BreadcrumbPropsBase & {
  wrapperRef?: MutableRefObject<HTMLDivElement>
  style: any
}) {
  const wrapperRef = useRef<HTMLDivElement | undefined>()
  const [visibleListId, setVisibleListId] = useState<string>('')
  const children: ReactNode[] = []

  if (!collapsible) {
    minLength = breadcrumbs.length
    maxLength = breadcrumbs.length
  } else {
    minLength = Math.min(Math.max(minLength, 0), breadcrumbs.length)
    maxLength = Math.min(maxLength, breadcrumbs.length)
  }

  for (let i = minLength; i <= maxLength; ++i) {
    children.push(
      <CrumbList
        key={i}
        breadcrumbs={breadcrumbs}
        maxLength={i}
        visibleListId={visibleListId}
      />
    )
  }

  const refitCrumbList = useCallback(
    ({ width: wrapperWidth }: { width: number }) => {
      const lists = Array.from(
        wrapperRef?.current?.querySelectorAll(`[${CRUMB_LIST_ATTR}]`)
      )
      const { id } = lists.reduce(
        (prev, next) => {
          const prevWidth = prev.width
          const nextWidth = next?.scrollWidth

          if (
            (prevWidth > wrapperWidth &&
              (nextWidth <= prevWidth || nextWidth < wrapperWidth)) ||
            nextWidth <= wrapperWidth
          ) {
            return { width: nextWidth, id: next.id }
          }

          return prev
        },
        { width: Infinity, id: '' }
      )

      setVisibleListId(id)
    },
    [wrapperRef]
  )

  // Refit breadcrumb list on resize
  useResizeObserver(wrapperRef, refitCrumbList)

  // Make sure to also refit if breadcrumbs data changes
  useEffect(() => {
    const wrapperWidth =
      wrapperRef?.current?.getBoundingClientRect?.()?.width || 0

    refitCrumbList({ width: wrapperWidth })
  }, [breadcrumbs, refitCrumbList, wrapperRef])

  useEffect(() => {
    if (visibleListId) {
      wrapperRef.current?.dispatchEvent(new Event('refitdone'))
    }
  }, [visibleListId])

  return (
    <DynamicBreadcrumbsSC
      ref={(elt: any) => {
        wrapperRef.current = elt
        if (transitionRef) transitionRef.current = elt
      }}
      {...props}
    >
      {children}
    </DynamicBreadcrumbsSC>
  )
}

export function Breadcrumbs({
  minLength = 0,
  maxLength = Infinity,
  collapsible = true,
  breadcrumbs: propsCrumbs,
  ...props
}: BreadcrumbsProps & NavProps) {
  const contextCrumbs = useContext(BreadcrumbsContext)?.breadcrumbs
  const breadcrumbs = propsCrumbs || contextCrumbs

  if (!breadcrumbs) {
    throw Error(
      "<Breadcrumbs> must be provided a 'breadcrumbs' prop or used inside a <BreadcrumbProvider>"
    )
  }
  const prevBreadcrumbs = usePrevious(breadcrumbs)
  const transitionKey = useRef<number>(0)

  if (prevBreadcrumbs !== breadcrumbs) {
    transitionKey.current++
  }

  return (
    <Nav
      aria-label="breadcrumbs"
      {...props}
    >
      {/* Prevent flashing by swapping in new hidden component every time breadcrumbs
      change and waiting for refit before making visible and removing old breadcrumbs */}
      <SwitchTransition mode="in-out">
        <Transition
          key={String(transitionKey.current)}
          timeout={200}
          // Typing for 'addEndListener' on <Transition> component is incorrect
          // when not providing 'ref' prop
          // @ts-expect-error
          addEndListener={(node, done) => {
            node?.addEventListener('refitdone', done, false)
          }}
        >
          {(state) => (
            <DynamicBreadcrumbs
              minLength={minLength}
              maxLength={maxLength}
              collapsible={collapsible}
              breadcrumbs={breadcrumbs}
              style={(transitionStyles as any)[state]}
            />
          )}
        </Transition>
      </SwitchTransition>
    </Nav>
  )
}
