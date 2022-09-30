import {
  Div, DivProps, Flex, FlexProps,
} from 'honorable'
import {
  Fragment,
  ReactNode,
  Ref,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import PropTypes from 'prop-types'
import { mergeRefs } from '@react-aria/utils'

import useResizeObserver from '../hooks/useResizeObserver'

import StatusOkIcon from './icons/StatusOkIcon'
import type createIcon from './icons/createIcon'
import Tooltip from './Tooltip'
import WrapWithIf from './WrapWithIf'

type StepBaseProps = {
  stepTitle: ReactNode
  IconComponent: ReturnType<typeof createIcon>
  iconSize?: number
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
}

export type StepperSteps = (StepBaseProps & { key: string })[]

type StepperProps = FlexProps & {
  stepIndex: number
  steps: StepperSteps
  vertical?: boolean
  forceCollapse?: boolean
  collapseAtWidth?: number
}

const propTypes = {
  stepIndex: PropTypes.number.isRequired,
  steps: PropTypes.arrayOf(PropTypes.shape({
    stepTitle: PropTypes.node.isRequired,
    IconComponent: PropTypes.func.isRequired,
    iconSize: PropTypes.number,
  }).isRequired).isRequired,
}

function Step({
  isActive = false,
  isComplete = false,
  stepTitle,
  IconComponent,
  iconSize = 24,
  circleSize = 48,
  vertical = false,
  collapseTitles = false,
  ...props
}: StepProps) {
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
      width="100%"
      minWidth="68px"
      maxWidth={vertical ? '100%' : '100px'}
      direction={vertical ? 'row' : 'column'}
      align="center"
      {...props}
    >
      <WrapWithIf
        condition={collapseTitles}
        wrapper={<Tooltip label={stepTitle} />}
      >
        <Div
          position="relative"
          width={circleSize}
          height={circleSize}
          marginLeft={vertical ? 'none' : 'auto'}
          marginRight={vertical ? 'none' : 'auto'}
          borderRadius={1000}
          backgroundColor="fill-one"
          border={`1px solid ${
            isActive ? 'action-link-active' : 'border-fill-two'
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
            className={isComplete ? '' : shownClassName}
            {...completeIconStyles}
          >
            <IconComponent
              size={iconSize}
              color={isActive ? 'action-link-active' : 'text-xlight'}
            />
          </Flex>
          <Flex
            width="100%"
            height="100%"
            position="absolute"
            justifyContent="center"
            alignItems="center"
            className={isComplete ? shownClassName : ''}
            {...completeIconStyles}
          >
            <StatusOkIcon
              color="#17E86E"
              size={24}
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
          color={isActive ? 'text' : 'text-xlight'}
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
  ...props
}: StepConnectionProps) {
  return (
    <Div
      width={vertical ? 1 : '100%'}
      height={vertical ? 30 : 1}
      flexGrow={1}
      backgroundColor="border"
      position="relative"
      aria-hidden="true"
      {...props}
    >
      <Div
        width={vertical ? 1 : isActive ? '100%' : 0}
        height={vertical ? (isActive ? 30 : 0) : '100%'}
        position="absolute"
        left={0}
        top={0}
        backgroundColor="text"
        transition="width 0.1s ease-out, height 0.1s ease-out"
      />
    </Div>
  )
}

function StepperRef({
  stepIndex,
  steps,
  vertical = false,
  collapseAtWidth = 160,
  forceCollapse = false,
}: StepperProps,
ref: Ref<any>) {
  const circleSize = 48
  const eltRef = useRef<HTMLDivElement>()
  const mergedRef = mergeRefs(ref, eltRef)
  const [collapseTitles, setCollapseTitles] = useState(true)

  const attemptCollapse = useCallback(() => {
    if (vertical && forceCollapse) {
      setCollapseTitles(true)

      return
    }
    setCollapseTitles(forceCollapse || eltRef?.current?.clientWidth < collapseAtWidth)
  },
  [forceCollapse, eltRef, collapseAtWidth, vertical])

  useEffect(attemptCollapse, [vertical, forceCollapse, attemptCollapse])
  useResizeObserver(eltRef, attemptCollapse)

  return (
    <Flex
      ref={mergedRef}
      width="100%"
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
            iconSize={step.iconSize || 24}
            circleSize={48}
            vertical={vertical}
            collapseTitles={vertical && collapseTitles}
          />
          {index < steps.length - 1 && (
            <StepConnection
              isActive={stepIndex > index}
              vertical={vertical}
              marginTop={vertical ? 'small' : circleSize / 2}
              marginBottom={vertical ? 'small' : 'none'}
              marginLeft={vertical ? 'large' : 'none'}
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
