import classNames from 'classnames'
import PropTypes from 'prop-types'
import {
  Dispatch,
  PropsWithChildren,
  forwardRef,
  useMemo,
} from 'react'
import styled, { useTheme } from 'styled-components'
import { ColorKey, Severity } from 'src/types'
import { Flex } from 'honorable'
import AnimateHeight from 'react-animate-height'

import { CaretDownIcon } from '../icons'

import {
  FillLevel,
  FillLevelProvider,
  isFillLevel,
  toFillLevel,
  useFillLevel,
} from './contexts/FillLevelContext'
import Button, { ButtonProps } from './Button'
import ErrorIcon from './icons/ErrorIcon'
import InfoIcon from './icons/InfoIcon'
import StatusOkIcon from './icons/StatusOkIcon'
import WarningIcon from './icons/WarningIcon'
import IconFrame from './IconFrame'

const SEVERITIES = ['info', 'danger', 'warning', 'success'] as const

export type CalloutSeverity = Extract<Severity, typeof SEVERITIES[number]>
const DEFAULT_SEVERITY: CalloutSeverity = 'info'

export type CalloutSize = 'compact' | 'full'

const severityToIconColorKey: Record<CalloutSeverity, ColorKey> = {
  info: 'icon-info',
  success: 'icon-success',
  warning: 'icon-warning',
  danger: 'icon-danger',
}

const severityToBorderColorKey: Record<CalloutSeverity, ColorKey> = {
  info: 'border-info',
  success: 'border-success',
  warning: 'border-warning',
  danger: 'border-danger',
}

const severityToText: Record<CalloutSeverity, string> = {
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  danger: 'Danger',
}

const severityToIcon: Record<CalloutSeverity, any> = {
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
  buttonProps?: ButtonProps
  fillLevel?: FillLevel
  className?: string
  expandable?: boolean
  expanded?: boolean
  onExpand?: Dispatch<boolean>
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
  severity = DEFAULT_SEVERITY,
  size = 'full',
  expandable = false,
  expanded = false,
  onExpand,
  fillLevel,
  className,
  buttonProps,
  children,
},
ref) => {
  severity = useMemo(() => {
    if (!severityToIconColorKey[severity]) {
      console.warn(`Callout: Incorrect severity (${severity}) specified. Valid values are ${SEVERITIES.map(s => `"${s}"`).join(', ')}. Defaulting to "${DEFAULT_SEVERITY}".`)

      return DEFAULT_SEVERITY
    }

    return severity
  }, [severity])
  const theme = useTheme()

  const text = severityToText[severity]
  const iconColor = theme.colors[severityToIconColorKey[severity]]
  const borderColorKey = severityToBorderColorKey[severity]
  const Icon = severityToIcon[severity]
  const parentFillLevel = useFillLevel()

  fillLevel = toFillLevel(Math.max(2,
    isFillLevel(fillLevel) && fillLevel >= 0
      ? fillLevel
      : parentFillLevel + 1))

  let iconTopMargin = size === 'full' ? 0 : 2

  if (title) {
    iconTopMargin += 2
  }

  return (
    <FillLevelProvider value={fillLevel}>
      <CalloutWrap
        className={`${className} ${classNames({ expandable })}`}
        $borderColorKey={borderColorKey}
        $fillLevel={fillLevel}
        $size={size}
        $expanded={expanded}
        ref={ref}
        onClick={expandable && !expanded ? () => onExpand && onExpand(!expanded) : null}
      >
        <div className="icon">
          <Icon
            marginTop={iconTopMargin}
            size={sizeToIconSize[size]}
            color={iconColor}
            display="flex"
          />
        </div>
        <div className="content">
          <h6 className={classNames({ visuallyHidden: !title, expandable })}>
            <span className="visuallyHidden">{`${text}: `}</span>
            {title}
          </h6>
          <AnimateHeight height={(expandable && expanded) || !expandable ? 'auto' : 0}>
            <div className="children">{children}</div>
            {buttonProps && (
              <div className="buttonArea">
                <CalloutButton {...buttonProps} />
              </div>
            )}
          </AnimateHeight>
        </div>
        {expandable && (
          <Flex
            grow={1}
            justify="flex-end"
          >
            <IconFrame
              textValue=""
              display="flex"
              size="small"
              clickable
              onClick={() => onExpand && onExpand(!expanded)}
              icon={<CaretDownIcon className="expandIcon" />}
            />
          </Flex>
        )}
      </CalloutWrap>
    </FillLevelProvider>
  )
})

const CalloutWrap = styled.div<{
  $borderColorKey: string
  $size: CalloutSize
  $fillLevel: FillLevel
  $expanded: boolean
}>(({
  theme, $size, $fillLevel, $borderColorKey, $expanded,
}) => ({
  position: 'relative',
  display: 'flex',
  gap: theme.spacing.small,
  padding:
    $size === 'compact'
      ? `${theme.spacing.xsmall}px ${theme.spacing.medium}px`
      : `${theme.spacing.medium}px`,
  margin: 0,
  borderRadius: theme.borderRadiuses.medium,
  ...theme.partials.text.body2LooseLineHeight,
  backgroundColor:
    $fillLevel >= 3 ? theme.colors['fill-three'] : theme.colors['fill-two'],
  color: theme.colors['text-light'],

  '&.expandable': {
    cursor: $expanded ? 'inherit' : 'pointer',

    ...(!$expanded && {
      '&:hover': {
        backgroundColor: $fillLevel >= 3 ? theme.colors['fill-four'] : theme.colors['fill-three'],
      },
    }),
  },

  h6: {
    ...theme.partials.text.body1Bold,
    color: theme.colors.text,
    margin: 0,
    padding: 0,
    marginBottom: theme.spacing.small,

    '&.expandable': {
      marginBottom: $expanded ? theme.spacing.small : 0,
      transition: 'margin-bottom .5s',
    },
  },
  '.content': {
    width: '100%',
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
    marginTop:
      $size === 'compact' ? theme.spacing.xsmall : theme.spacing.medium,
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
    background: theme.colors[$borderColorKey],
    zIndex: 2,
  },
  '&::after': {
    borderRadius: theme.borderRadiuses.medium,
    border:
      $fillLevel >= 3 ? theme.borders['fill-three'] : theme.borders['fill-two'],
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
  '& a, & a:any-link': {
    ...theme.partials.text.inlineLink,
  },
  '.expandIcon': {
    ...theme.partials.dropdown.arrowTransition({ isOpen: $expanded }),
  },
}))

Callout.propTypes = {
  severity: PropTypes.oneOf(SEVERITIES),
  title: PropTypes.string,
  size: PropTypes.oneOf(['compact', 'full']),
  fillLevel: PropTypes.oneOf([0, 1, 2, 3]),
  className: PropTypes.string,
}

export default Callout
