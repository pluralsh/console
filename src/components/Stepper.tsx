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
import styled from 'styled-components'

import useResizeObserver from '../hooks/useResizeObserver'

import type createIcon from './icons/createIcon'
import { StepperStepConnection } from './StepperStepConnection'
import { StepperStep } from './StepperStep'

export const DEFAULT_CIRCLE_SIZE = 48
export const DEFAULT_ICON_SIZE = 24
export const COMPACT_CIRCLE_SIZE = 32
export const COMPACT_ICON_SIZE = 16

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

export type StepProps = StepBaseProps & {
  isActive?: boolean
  isComplete?: boolean
  circleSize?: number
  vertical?: boolean
  collapseTitles?: boolean
}

export type StepConnectionProps = {
  isActive: boolean
  vertical?: boolean
  compact?: boolean
  circleSize?: number
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

const StepperSC = styled.div<{ $compact: boolean; $vertical: boolean }>(
  ({ $compact, $vertical }) => ({
    display: 'flex',
    width: $compact ? 'auto' : '100%',
    flexDirection: $vertical ? 'column' : 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
  })
)

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
    <StepperSC
      $compact={compact}
      $vertical={vertical}
      ref={mergedRef}
    >
      {steps.map((step, index) => (
        <Fragment key={step.key}>
          <StepperStep
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
            <StepperStepConnection
              isActive={stepIndex > index}
              vertical={vertical}
              circleSize={step.circleSize}
              compact={compact}
            />
          )}
        </Fragment>
      ))}
    </StepperSC>
  )
}

const Stepper = forwardRef(StepperRef)

export default Stepper
