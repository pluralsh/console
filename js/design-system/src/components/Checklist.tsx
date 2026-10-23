import {
  type ComponentPropsWithRef,
  type Dispatch,
  type JSX,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import AnimateHeight from 'react-animate-height'
import styled from 'styled-components'

import { ChecklistFooter, type ChecklistFooterProps } from './ChecklistFooter'
import { ChecklistItemInner, type ChecklistItemProps } from './ChecklistItem'
import DropdownArrowIcon from './icons/DropdownArrowIcon'

const heightAnimationDuration = 333 // 333ms

const Checklist = styled(ChecklistUnstyled)(({ theme }) => ({
  background: theme.colors['fill-two'],
  color: theme.colors.text,
  display: 'flex',
  flexDirection: 'column',
  width: 480,

  '> div': {
    borderTop: theme.borders['outline-focused'],
    borderWidth: 4,
    borderTopRightRadius: theme.borderRadiuses.large,
  },

  '.header': {
    ...theme.partials.text.subtitle1,
    borderBottom: theme.borders['fill-two'],
    padding: `${theme.spacing.medium} ${theme.spacing.large}`,
    cursor: 'pointer',

    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  '.content': {
    padding: `${theme.spacing.xsmall} 0`,
    borderBottom: theme.borders['fill-two'],
    display: 'flex',
    flexDirection: 'column',
  },

  '.finishContainer': {
    paddingTop: `${theme.spacing.large}`,
    paddingBottom: `${theme.spacing.medium}`,
  },

  '.shrink': {
    opacity: 0,
    visibility: 'hidden',
    transition: 'opacity 333ms linear, max-height 333ms linear',
  },

  '.grow': {
    transition: 'opacity 333ms linear, max-height 333ms linear',
  },

  '.arrowUp': {
    ...theme.partials.dropdown.arrowTransition({ isOpen: true }),
  },

  '.arrowDown': {
    ...theme.partials.dropdown.arrowTransition({ isOpen: false }),
  },
}))

type ChecklistProps = ComponentPropsWithRef<'div'> & {
  label: string
  stateProps: ChecklistStateProps
  footerChildren:
    | ReactElement<ChecklistFooterProps>
    | ReactElement<ChecklistFooterProps>[]
  completeChildren: ReactElement<any>
  children: ReactElement<ChecklistItemProps>[]
}

type ChecklistStateProps = {
  onSelectionChange?: Dispatch<number | null>
  onFocusChange?: Dispatch<number>
  onOpenChange?: Dispatch<boolean>
  selectedKey?: number | null
  focusedKey?: number
  completedKey?: number
  isOpen?: boolean
  isDismissed?: boolean
}

function ChecklistUnstyled({
  label,
  stateProps,
  children,
  footerChildren,
  completeChildren,
  ...props
}: ChecklistProps): JSX.Element {
  const {
    isOpen = true,
    isDismissed,
    selectedKey,
    focusedKey,
    completedKey,
    onSelectionChange,
    onFocusChange,
    onOpenChange,
  } = stateProps
  const finished = completedKey === children.length - 1
  // Render fully expanded until the first measurement so heights can be captured
  const [measured, setMeasured] = useState(false)
  const itemsContainerRef = useRef<HTMLDivElement>(null)
  const finishedContainerRef = useRef<HTMLDivElement>(null)

  const [itemContainerHeight, setItemContainerHeight] = useState<number>(-1)
  const [finishedContainerHeight, setFinishedContainerHeight] =
    useState<number>(-1)

  const onSelectionChangeWrapper = useCallback(
    (idx: number | null) => {
      if (idx !== null && (idx >= children.length || idx < 0)) return
      onSelectionChange?.(idx)
    },
    [children, onSelectionChange]
  )
  const onFocusChangeWrapper = useCallback(
    (idx: number) => {
      if (idx >= children.length || idx < -1) return
      onFocusChange?.(idx)
    },
    [children, onFocusChange]
  )

  const checklistItemInnerWrapper = useMemo(
    () =>
      children.map((child, index) => (
        <ChecklistItemInner
          {...child.props}
          key={index}
          index={index}
          selected={selectedKey === index}
          focused={focusedKey === index}
          completed={(completedKey ?? -1) >= index}
          onSelectionChange={onSelectionChangeWrapper}
          onFocusChange={onFocusChangeWrapper}
        >
          {child}
        </ChecklistItemInner>
      )),
    [
      children,
      selectedKey,
      focusedKey,
      completedKey,
      onSelectionChangeWrapper,
      onFocusChangeWrapper,
    ]
  )

  useEffect(() => {
    if (!itemsContainerRef.current || !finishedContainerRef.current) return

    const maxItemContainerHeight = Math.max(
      itemContainerHeight,
      itemsContainerRef.current.getBoundingClientRect().height
    )
    const maxFinishedContainerHeight = Math.max(
      finishedContainerHeight,
      finishedContainerRef.current.getBoundingClientRect().height
    )

    setItemContainerHeight(maxItemContainerHeight)
    setFinishedContainerHeight(maxFinishedContainerHeight)
    setMeasured(true)
  }, [
    itemsContainerRef,
    finishedContainerRef,
    setItemContainerHeight,
    setFinishedContainerHeight,
    itemContainerHeight,
    finishedContainerHeight,
  ])

  return (
    <AnimateHeight
      height={isDismissed ? 0 : 'auto'}
      {...props}
    >
      <div
        className={finished ? 'shrink' : 'grow'}
        style={finished ? { maxHeight: 0 } : { maxHeight: itemContainerHeight }}
        ref={itemsContainerRef}
      >
        <div
          className="header"
          onClick={() => onOpenChange?.(!isOpen)}
        >
          <div>{label}</div>
          <DropdownArrowIcon className={isOpen ? 'arrowUp' : 'arrowDown'} />
        </div>
        <AnimateHeight
          height={!measured || isOpen ? 'auto' : 0}
          duration={heightAnimationDuration}
        >
          <div className="content">{checklistItemInnerWrapper}</div>
          <ChecklistFooter>{footerChildren}</ChecklistFooter>
        </AnimateHeight>
      </div>
      <div
        className={finished ? 'finishContainer grow' : 'finishContainer shrink'}
        style={
          !measured || finished
            ? { maxHeight: finishedContainerHeight }
            : { maxHeight: 0, padding: 0 }
        }
        ref={finishedContainerRef}
      >
        {completeChildren}
      </div>
    </AnimateHeight>
  )
}

export type { ChecklistStateProps, ChecklistProps }
export { Checklist }
