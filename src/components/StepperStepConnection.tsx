import styled from 'styled-components'

import { DEFAULT_CIRCLE_SIZE, type StepConnectionProps } from './Stepper'

const StepperStepConnectionSC = styled.div<{
  $compact: boolean
  $vertical: boolean
  $isActive: boolean
  $circleSize: number
}>(({ theme, $vertical, $compact, $isActive, $circleSize }) => ({
  width: $compact ? '16px' : $vertical ? 1 : '100%',
  height: $vertical ? 30 : 1,
  flexGrow: $compact ? 0 : 1,
  backgroundColor: theme.colors.border,
  position: 'relative',
  alignSelf: $compact ? 'center' : 'none',
  marginTop: $vertical
    ? theme.spacing.small
    : $compact
    ? 0
    : ($circleSize || DEFAULT_CIRCLE_SIZE) / 2,
  marginBottom: $vertical ? theme.spacing.small : 'none',
  marginLeft: $vertical ? theme.spacing.large : 'none',
  '.stepConnectionInner': {
    width: $vertical ? 1 : $isActive ? '100%' : 0,
    height: $vertical ? ($isActive ? 30 : 0) : '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: theme.colors['border-selected'],
    transition: 'width 0.1s ease-out, height 0.1s ease-out',
  },
}))

export function StepperStepConnection({
  isActive = false,
  vertical = false,
  compact = false,
  circleSize = DEFAULT_CIRCLE_SIZE,
  ...props
}: StepConnectionProps) {
  return (
    <StepperStepConnectionSC
      $isActive={isActive}
      $vertical={vertical}
      $compact={compact}
      $circleSize={circleSize}
      aria-hidden="true"
      {...props}
    >
      <div className="stepConnectionInner" />
    </StepperStepConnectionSC>
  )
}
