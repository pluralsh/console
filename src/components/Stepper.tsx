import {
  Fragment,
  type ReactNode,
  type Ref,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { mergeRefs } from '@react-aria/utils'
import { useTheme } from 'styled-components'

import useResizeObserver from '../hooks/useResizeObserver'

import StatusOkIcon from './icons/StatusOkIcon'
import type createIcon from './icons/createIcon'
import Tooltip from './Tooltip'
import WrapWithIf from './WrapWithIf'

const DEFAULT_CIRCLE_SIZE = 48
const DEFAULT_ICON_SIZE = 24
const COMPACT_CIRCLE_SIZE = 32
const COMPACT_ICON_SIZE = 16

type StepBaseProps = {
  stepTitle?: ReactNode
  IconComponent?: ReturnType<typeof createIcon>
  imageUrl?: string
  iconSize?: number
  circleSize?: number
  collapseTitle?: boolean
  vertical?: boolean
  compact?: boolean
  canComplete?: boolean
}

type StepProps = StepBaseProps & {
  isActive?: boolean
  isComplete?: boolean
  circleSize?: number
  vertical?: boolean
  collapseTitles?: boolean
}

type StepConnectionProps = {
  isActive: boolean
  vertical?: boolean
  compact?: boolean
}

export type StepperSteps = (StepBaseProps & { key: string })[]

type StepperProps = {
  stepIndex: number
  steps: StepperSteps
  vertical?: boolean
  forceCollapse?: boolean
  collapseAtWidth?: number
  compact?: boolean
}

function Step({
  isActive = false,
  isComplete = false,
  stepTitle,
  IconComponent,
  imageUrl = '',
  iconSize,
  circleSize,
  vertical = false,
  collapseTitles = false,
  compact = false,
  canComplete = true,
  ...props
}: StepProps) {
  const theme = useTheme()
  const bounceEase = 'cubic-bezier(.37,1.4,.62,1)'
  const shownClassName = 'shown'
  const completeIconStyles = {
    opacity: '1',
    transform: 'scale(0)',
    transition: 'all 0.2s ease',
    [`&.${shownClassName}`]: {
      transform: 'scale(1)',
      opacity: '1',
      transition: `transform 0.3s ${bounceEase}, opacity 0.1s ease`,
      transitionDelay: '0.1s',
    },
  }

  circleSize =
    circleSize ?? (compact ? COMPACT_CIRCLE_SIZE : DEFAULT_CIRCLE_SIZE)
  iconSize = iconSize ?? (compact ? COMPACT_ICON_SIZE : DEFAULT_ICON_SIZE)

  return (
    <div
      css={{
        display: 'flex',
        width: compact ? 'auto' : '100%',
        minWidth: compact ? 'auto' : '68px',
        maxWidth: vertical || compact ? '100%' : '100px',
        flexDirection: vertical || compact ? 'row' : 'column',
        alignItems: 'center',
        alignSelf: 'center',
      }}
      {...props}
    >
      <WrapWithIf
        condition={collapseTitles && !!stepTitle}
        wrapper={<Tooltip label={stepTitle} />}
      >
        <div
          css={{
            position: 'relative',
            width: circleSize,
            height: circleSize,
            marginLeft: vertical || compact ? 'none' : 'auto',
            marginRight: vertical || compact ? 'none' : 'auto',
            borderRadius: '100%',
            backgroundColor:
              theme.mode === 'light'
                ? theme.colors['fill-zero']
                : theme.colors['fill-one'],
            border: `1px solid ${
              isActive ? theme.colors['border-selected'] : theme.colors.border
            }`,
            transition: 'all 0.2s ease',
            transitionDelay: '0.1',
            flexShrink: 0,
          }}
        >
          <div
            className={canComplete && isComplete ? '' : shownClassName}
            css={{
              display: 'flex',
              width: '100%',
              height: '100%',
              position: 'absolute',
              justifyContent: 'center',
              alignItems: 'center',
              ...completeIconStyles,
            }}
          >
            {IconComponent && (
              <IconComponent
                size={iconSize}
                color={
                  isActive
                    ? theme.colors['icon-default']
                    : theme.colors['icon-xlight']
                }
              />
            )}
            {imageUrl && (
              <img
                src={imageUrl}
                width={iconSize}
                height={iconSize}
                css={{
                  opacity: isActive ? 1 : 0.5,
                }}
              />
            )}
          </div>
          <div
            className={canComplete && isComplete ? shownClassName : ''}
            css={{
              display: 'flex',
              width: '100%',
              height: '100%',
              position: 'absolute',
              justifyContent: 'center',
              alignItems: 'center',
              ...completeIconStyles,
            }}
          >
            <StatusOkIcon
              color={
                compact
                  ? theme.colors['text-xlight']
                  : theme.colors['icon-success']
              }
              size={iconSize}
            />
          </div>
        </div>
      </WrapWithIf>
      {!collapseTitles && (
        <div
          css={{
            ...theme.partials.text.body2,
            marginTop: vertical || compact ? 'none' : theme.spacing.small,
            marginLeft: vertical || compact ? theme.spacing.small : 'none',
            marginRight: compact ? theme.spacing.small : 'none',
            textAlign: vertical || compact ? 'left' : 'center',
            color: isActive ? theme.colors.text : theme.colors['text-xlight'],
            transition: 'all 0.2s ease',
            transitionDelay: '0.1s',
            flexShrink: vertical || compact ? 1 : 0,
          }}
        >
          {stepTitle}
        </div>
      )}
    </div>
  )
}

function StepConnection({
  isActive = false,
  vertical = false,
  compact = false,
  ...props
}: StepConnectionProps) {
  const theme = useTheme()

  return (
    <div
      css={{
        width: compact ? '16px' : vertical ? 1 : '100%',
        height: vertical ? 30 : 1,
        flexGrow: compact ? 0 : 1,
        backgroundColor: theme.colors.border,
        position: 'relative',
        alignSelf: compact ? 'center' : 'none',
      }}
      aria-hidden="true"
      {...props}
    >
      <div
        css={{
          width: vertical ? 1 : isActive ? '100%' : 0,
          height: vertical ? (isActive ? 30 : 0) : '100%',
          position: 'absolute',
          left: 0,
          top: 0,
          backgroundColor: theme.colors['border-selected'],
          transition: 'width 0.1s ease-out, height 0.1s ease-out',
        }}
      />
    </div>
  )
}

function StepperRef(
  {
    stepIndex,
    steps,
    vertical = false,
    collapseAtWidth = 160,
    forceCollapse = false,
    compact = false,
  }: StepperProps,
  ref: Ref<any>
) {
  const theme = useTheme()
  const eltRef = useRef<HTMLDivElement>()
  const mergedRef = mergeRefs(ref, eltRef)
  const [collapseTitles, setCollapseTitles] = useState(true)

  const attemptCollapse = useCallback(() => {
    if (vertical && forceCollapse) {
      setCollapseTitles(true)

      return
    }
    setCollapseTitles(
      forceCollapse || eltRef?.current?.clientWidth < collapseAtWidth
    )
  }, [forceCollapse, eltRef, collapseAtWidth, vertical])

  useEffect(attemptCollapse, [vertical, forceCollapse, attemptCollapse])
  useResizeObserver(eltRef, attemptCollapse)

  return (
    <div
      ref={mergedRef}
      css={{
        display: 'flex',
        width: compact ? 'auto' : '100%',
        flexDirection: vertical ? 'column' : 'row',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {steps.map((step, index) => (
        <Fragment key={step.key}>
          <Step
            isActive={stepIndex === index}
            isComplete={stepIndex > index}
            stepTitle={step.stepTitle}
            IconComponent={step.IconComponent}
            imageUrl={step.imageUrl}
            iconSize={step.iconSize}
            circleSize={step.circleSize}
            vertical={step.vertical || vertical}
            collapseTitles={(vertical && collapseTitles) || step.collapseTitle}
            compact={compact}
            canComplete={step.canComplete}
          />
          {index < steps.length - 1 && (
            <StepConnection
              isActive={stepIndex > index}
              vertical={vertical}
              css={{
                marginTop: vertical
                  ? theme.spacing.small
                  : compact
                  ? 0
                  : (step.circleSize || DEFAULT_CIRCLE_SIZE) / 2,
                marginBottom: vertical ? theme.spacing.small : 'none',
                marginLeft: vertical ? theme.spacing.large : 'none',
              }}
              compact={compact}
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}

const Stepper = forwardRef(StepperRef)

export default Stepper
