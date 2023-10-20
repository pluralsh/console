import styled, { useTheme } from 'styled-components'

import StatusOkIcon from './icons/StatusOkIcon'
import Tooltip from './Tooltip'
import WrapWithIf from './WrapWithIf'
import {
  COMPACT_CIRCLE_SIZE,
  COMPACT_ICON_SIZE,
  DEFAULT_CIRCLE_SIZE,
  DEFAULT_ICON_SIZE,
  type StepProps,
} from './Stepper'

const bounceEase = 'cubic-bezier(.37,1.4,.62,1)'
const shownClassName = 'shown'
const StepperStepSC = styled.div<{
  $compact: boolean
  $vertical: boolean
  $isActive: boolean
  $circleSize: number
}>(({ theme, $compact, $vertical, $isActive, $circleSize }) => ({
  display: 'flex',
  width: $compact ? 'auto' : '100%',
  minWidth: $vertical || $compact ? 'auto' : 68,
  maxWidth: $vertical || $compact ? '100%' : 100,
  flexDirection: $vertical || $compact ? 'row' : 'column',
  alignItems: 'center',
  alignSelf: 'center',
  '.stepInner': {
    position: 'relative',
    width: $circleSize,
    height: $circleSize,
    marginLeft: $vertical || $compact ? 'none' : 'auto',
    marginRight: $vertical || $compact ? 'none' : 'auto',
    borderRadius: '100%',
    backgroundColor:
      theme.mode === 'light'
        ? theme.colors['fill-zero']
        : theme.colors['fill-one'],
    border: `1px solid ${
      $isActive ? theme.colors['border-selected'] : theme.colors.border
    }`,
    transition: 'all 0.2s ease',
    transitionDelay: '0.1',
    flexShrink: 0,
  },
}))
const StepperStepTitleSC = styled.div<{
  $compact: boolean
  $vertical: boolean
  $isActive: boolean
}>(({ theme, $compact, $vertical, $isActive }) => ({
  ...theme.partials.text.body2,
  marginTop: $vertical || $compact ? 'none' : theme.spacing.small,
  marginLeft: $vertical || $compact ? theme.spacing.small : 'none',
  marginRight: $compact ? theme.spacing.small : 'none',
  textAlign: $vertical || $compact ? 'left' : 'center',
  color: $isActive ? theme.colors.text : theme.colors['text-xlight'],
  transition: 'all 0.2s ease',
  transitionDelay: '0.1s',
  flexShrink: $vertical || $compact ? 1 : 0,
}))
const StepperStepIconSC = styled.div<{
  $compact: boolean
  $vertical: boolean
  $isActive: boolean
}>(({ $isActive }) => ({
  display: 'flex',
  width: '100%',
  height: '100%',
  position: 'absolute',
  justifyContent: 'center',
  alignItems: 'center',

  opacity: '1',
  transform: 'scale(0)',
  transition: 'all 0.2s ease',
  img: {
    opacity: $isActive ? 1 : 0.5,
  },
  [`&.${shownClassName}`]: {
    transform: 'scale(1)',
    opacity: '1',
    transition: `transform 0.3s ${bounceEase}, opacity 0.1s ease`,
    transitionDelay: '0.1s',
  },
}))

export function StepperStep({
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

  circleSize =
    circleSize ?? (compact ? COMPACT_CIRCLE_SIZE : DEFAULT_CIRCLE_SIZE)
  iconSize = iconSize ?? (compact ? COMPACT_ICON_SIZE : DEFAULT_ICON_SIZE)

  return (
    <StepperStepSC
      $compact={compact}
      $vertical={vertical}
      $isActive={isActive}
      $circleSize={circleSize}
      {...props}
    >
      <WrapWithIf
        condition={collapseTitles && !!stepTitle}
        wrapper={<Tooltip label={stepTitle} />}
      >
        <div className="stepInner">
          <StepperStepIconSC
            $compact={compact}
            $vertical={vertical}
            $isActive={isActive}
            className={canComplete && isComplete ? '' : shownClassName}
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
              />
            )}
          </StepperStepIconSC>
          <StepperStepIconSC
            $compact={compact}
            $vertical={vertical}
            $isActive={isActive}
            className={canComplete && isComplete ? shownClassName : ''}
          >
            <StatusOkIcon
              color={
                compact
                  ? theme.colors['text-xlight']
                  : theme.colors['icon-success']
              }
              size={iconSize}
            />
          </StepperStepIconSC>
        </div>
      </WrapWithIf>
      {!collapseTitles && (
        <StepperStepTitleSC
          $compact={compact}
          $vertical={vertical}
          $isActive={isActive}
        >
          {stepTitle}
        </StepperStepTitleSC>
      )}
    </StepperStepSC>
  )
}
