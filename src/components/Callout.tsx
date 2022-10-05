import classNames from 'classnames'

import { PropsWithChildren, forwardRef } from 'react'

import styled, { DefaultTheme, useTheme } from 'styled-components'

import {
  FillLevel,
  FillLevelProvider,
  toFillLevel,
  useFillLevel,
} from './contexts/FillLevelContext'
import Button, { ButtonProps } from './Button'
import ErrorIcon from './icons/ErrorIcon'
import InfoIcon from './icons/InfoIcon'
import StatusOkIcon from './icons/StatusOkIcon'
import WarningIcon from './icons/WarningIcon'

export type CalloutSeverity = 'info' | 'success' | 'warning' | 'danger'
export type CalloutSize = 'compact' | 'full'

function styleToColor(theme: DefaultTheme): Record<CalloutSeverity, string> {
  return {
    info: theme.colors['text-primary-accent'],
    success: theme.colors['text-success-light'],
    warning: theme.colors['text-warning-light'],
    danger: theme.colors['text-error-light'],
  }
}

const styleToText: Record<CalloutSeverity, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  danger: 'Danger',
}

const styleToIcon: Record<CalloutSeverity, any> = {
  info: InfoIcon,
  success: StatusOkIcon,
  warning: WarningIcon,
  danger: ErrorIcon,
}

const sizeToIconSize: Record<CalloutSize, number> = {
  compact: 16,
  full: 20,
}

export type CalloutProps = PropsWithChildren<{
  title?: string
  severity?: CalloutSeverity
  size?: CalloutSize
  buttonProps: ButtonProps
  fillLevel?: FillLevel
  className?: string
}>

export function CalloutButton(props: ButtonProps) {
  return (
    <Button
      secondary
      {...props}
    />
  )
}

const Callout = forwardRef<HTMLDivElement, CalloutProps>(({
  title,
  severity = 'info',
  size = 'full',
  fillLevel,
  className,
  buttonProps,
  children,
},
ref) => {
  const theme = useTheme()
  const text = styleToText[severity]
  const color = styleToColor(theme)[severity]
  const Icon = styleToIcon[severity]
  const parentFillLevel = useFillLevel()

  fillLevel = typeof fillLevel === 'number' && fillLevel >= 0
    ? fillLevel
    : toFillLevel(parentFillLevel + 1)

  let iconTopMargin = size === 'full' ? 0 : 2

  if (title) {
    iconTopMargin += 2
  }

  return (
    <FillLevelProvider value={2}>
      <CalloutWrap
        className={className}
        color={color}
        fillLevel={fillLevel}
        size={size}
        ref={ref}
      >
        <div className="icon">
          <Icon
            marginTop={iconTopMargin}
            size={sizeToIconSize[size]}
            color={color}
            display="flex"
          />
        </div>
        <div>
          <h6 className={classNames({ visuallyHidden: !title })}>
            <span className="visuallyHidden">{`${text}: `}</span>
            {title}
          </h6>
          <div className="children">{children}</div>
          {buttonProps && (
            <div className="buttonArea">
              <CalloutButton {...buttonProps} />
            </div>
          )}
        </div>
      </CalloutWrap>
    </FillLevelProvider>
  )
})

const CalloutWrap = styled.div<{
  color: string
  size: CalloutSize
  fillLevel: FillLevel
}>(({
  theme, color, size, fillLevel,
}) => ({
  position: 'relative',
  display: 'flex',
  gap: theme.spacing.small,
  padding:
    size === 'compact'
      ? `${theme.spacing.xsmall}px ${theme.spacing.medium}px`
      : `${theme.spacing.medium}px`,
  margin: 0,
  borderRadius: theme.borderRadiuses.medium,
  ...theme.partials.text.body2,
  backgroundColor:
    fillLevel >= 3 ? theme.colors['fill-three'] : theme.colors['fill-two'],
  color: theme.colors['text-light'],
  h6: {
    ...theme.partials.text.body1Bold,
    color: theme.colors.text,
    margin: 0,
    padding: 0,
    marginBottom: theme.spacing.xxsmall,
  },
  '.children *:first-child': {
    marginTop: '0',
  },
  '.children *:last-child': {
    marginBottom: '0',
  },
  '.buttonArea': {
    display: 'flex',
    gap: theme.spacing.xsmall,
    marginTop: size === 'compact' ? theme.spacing.xsmall : theme.spacing.medium,
  },
  '&::before, &::after': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    pointerEvents: 'none',
  },
  '&::before': {
    borderTopLeftRadius: theme.borderRadiuses.medium,
    borderBottomLeftRadius: theme.borderRadiuses.medium,
    right: 'unset',
    width: 3,
    background: color,
    zIndex: 2,
  },
  '&::after': {
    borderRadius: theme.borderRadiuses.medium,
    border:
      fillLevel >= 3 ? theme.borders['fill-three'] : theme.borders['fill-two'],
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    pointerEvents: 'none',
  },
  '.visuallyHidden': {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
}))

export default Callout
