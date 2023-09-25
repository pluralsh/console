import { Div, type DivProps, Flex, type FlexProps, Img } from 'honorable'
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
import PropTypes from 'prop-types'
import { mergeRefs } from '@react-aria/utils'

import { useTheme } from 'styled-components'

import useResizeObserver from '../hooks/useResizeObserver'

import StatusOkIcon from './icons/StatusOkIcon'
import type createIcon from './icons/createIcon'
import Tooltip from './Tooltip'
import WrapWithIf from './WrapWithIf'

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

type StepProps = DivProps &
  StepBaseProps & {
    isActive?: boolean
    isComplete?: boolean
    circleSize?: number
    vertical?: boolean
    collapseTitles?: boolean
  }

type StepConnectionProps = DivProps & {
  isActive: boolean
  vertical?: boolean
  compact?: boolean
}

export type StepperSteps = (StepBaseProps & { key: string })[]

type StepperProps = FlexProps & {
  stepIndex: number
  steps: StepperSteps
  vertical?: boolean
  forceCollapse?: boolean
  collapseAtWidth?: number
  compact?: boolean
}

const propTypes = {
  stepIndex: PropTypes.number.isRequired,
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      stepTitle: PropTypes.node,
      IconComponent: PropTypes.elementType,
      iconSize: PropTypes.number,
    }).isRequired
  ).isRequired,
}

function Step({
  isActive = false,
  isComplete = false,
  stepTitle,
  IconComponent,
  imageUrl = '',
  iconSize = 24,
  circleSize = 48,
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
    opacity: '0',
    transform: 'scale(0)',
    transition: 'all 0.2s ease',
    [`&.${shownClassName}`]: {
      transform: 'scale(1)',
      opacity: '1',
      transition: `transform 0.3s ${bounceEase}, opacity 0.1s ease`,
      transitionDelay: '0.1s',
    },
  }

  return (
    <Flex
      width={compact ? 'auto' : '100%'}
      minWidth={compact ? 'auto' : '68px'}
      maxWidth={vertical ? '100%' : '100px'}
      direction={vertical ? 'row' : 'column'}
      align="center"
      alignSelf="center"
      {...props}
    >
      <WrapWithIf
        condition={collapseTitles && !!stepTitle}
        wrapper={<Tooltip label={stepTitle} />}
      >
        <Div
          position="relative"
          width={circleSize}
          height={circleSize}
          marginLeft={vertical ? 'none' : 'auto'}
          marginRight={vertical ? 'none' : 'auto'}
          borderRadius="100%"
          backgroundColor={
            theme.mode === 'light'
              ? theme.colors['fill-zero']
              : theme.colors['fill-one']
          }
          border={`1px solid ${
            isActive ? theme.colors['border-selected'] : theme.colors.border
          }`}
          transition="all 0.2s ease"
          transitionDelay="0.1"
          flexShrink={0}
        >
          <Flex
            width="100%"
            height="100%"
            position="absolute"
            justifyContent="center"
            alignItems="center"
            className={canComplete && isComplete ? '' : shownClassName}
            {...completeIconStyles}
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
              <Img
                src={imageUrl}
                width={iconSize}
                height={iconSize}
                opacity={isActive ? 1 : 0.5}
              />
            )}
          </Flex>
          <Flex
            width="100%"
            height="100%"
            position="absolute"
            justifyContent="center"
            alignItems="center"
            className={canComplete && isComplete ? shownClassName : ''}
            {...completeIconStyles}
          >
            <StatusOkIcon
              color={
                compact
                  ? theme.colors['text-xlight']
                  : theme.colors['icon-success']
              }
              size={iconSize}
            />
          </Flex>
        </Div>
      </WrapWithIf>
      {!collapseTitles && (
        <Div
          body2
          marginTop={vertical ? 'none' : 'small'}
          marginLeft={vertical ? 'small' : 'none'}
          textAlign={vertical ? 'left' : 'center'}
          color={isActive ? theme.colors.text : theme.colors['text-xlight']}
          transition="all 0.2s ease"
          transitionDelay="0.1"
          flexShrink={vertical ? 1 : 0}
        >
          {stepTitle}
        </Div>
      )}
    </Flex>
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
    <Div
      width={compact ? '16px' : vertical ? 1 : '100%'}
      height={vertical ? 30 : 1}
      flexGrow={compact ? 0 : 1}
      backgroundColor={theme.colors.border}
      position="relative"
      aria-hidden="true"
      alignSelf={compact ? 'center' : 'none'}
      {...props}
    >
      <Div
        width={vertical ? 1 : isActive ? '100%' : 0}
        height={vertical ? (isActive ? 30 : 0) : '100%'}
        position="absolute"
        left={0}
        top={0}
        backgroundColor={theme.colors['border-selected']}
        transition="width 0.1s ease-out, height 0.1s ease-out"
      />
    </Div>
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
    <Flex
      ref={mergedRef}
      width={compact ? 'auto' : '100%'}
      direction={vertical ? 'column' : 'row'}
      justifyContent="space-between"
      overflow="hidden"
    >
      {steps.map((step, index) => (
        <Fragment key={step.key}>
          <Step
            isActive={stepIndex === index}
            isComplete={stepIndex > index}
            stepTitle={step.stepTitle}
            IconComponent={step.IconComponent}
            imageUrl={step.imageUrl}
            iconSize={step.iconSize || 24}
            circleSize={step.circleSize || 48}
            vertical={step.vertical || vertical}
            collapseTitles={(vertical && collapseTitles) || step.collapseTitle}
            compact={compact}
            canComplete={step.canComplete}
          />
          {index < steps.length - 1 && (
            <StepConnection
              isActive={stepIndex > index}
              vertical={vertical}
              marginTop={
                vertical ? 'small' : compact ? 0 : (step.circleSize || 48) / 2
              }
              marginBottom={vertical ? 'small' : 'none'}
              marginLeft={vertical ? 'large' : 'none'}
              compact={compact}
            />
          )}
        </Fragment>
      ))}
    </Flex>
  )
}

const Stepper = forwardRef(StepperRef)

// @ts-expect-error
Stepper.propTypes = propTypes

export default Stepper
