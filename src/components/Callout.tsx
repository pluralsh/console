import classNames from 'classnames'
import PropTypes from 'prop-types'
import { type Dispatch, type PropsWithChildren, forwardRef, useId } from 'react'
import styled, { useTheme } from 'styled-components'

import { Flex } from 'honorable'
import AnimateHeight from 'react-animate-height'

import { type ColorKey, type SeverityExt, sanitizeSeverity } from '../types'

import { CaretDownIcon, CloseIcon } from '../icons'

import { useDisclosure } from '../hooks/useDisclosure'

import {
  type FillLevel,
  FillLevelProvider,
  isFillLevel,
  toFillLevel,
  useFillLevel,
} from './contexts/FillLevelContext'
import Button, { type ButtonProps } from './Button'
import ErrorIcon from './icons/ErrorIcon'
import InfoIcon from './icons/InfoIcon'
import StatusOkIcon from './icons/StatusOkIcon'
import WarningIcon from './icons/WarningIcon'
import IconFrame from './IconFrame'

const CALLOUT_SEVERITIES = [
  'info',
  'danger',
  'warning',
  'success',
] as const satisfies Readonly<SeverityExt[]>

export type CalloutSeverity = Extract<
  SeverityExt,
  (typeof CALLOUT_SEVERITIES)[number]
>
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
  defaultExpanded?: boolean
  onExpand?: Dispatch<boolean>
  closeable?: boolean
  closed?: boolean
  onClose?: Dispatch<boolean>
  id?: string
}>

export function CalloutButton(props: ButtonProps) {
  return (
    <Button
      secondary
      {...props}
    />
  )
}

const Callout = forwardRef<HTMLDivElement, CalloutProps>(
  (
    {
      title,
      severity = DEFAULT_SEVERITY,
      size = 'full',
      expandable = false,
      expanded: expandedProp,
      defaultExpanded = false,
      onExpand: onExpandProp,
      closeable = false,
      closed = false,
      onClose,
      fillLevel,
      className,
      buttonProps,
      children,
      id,
    },
    ref
  ) => {
    if (expandable && closeable) {
      throw new Error(
        'Callout component cannot be expandable and closable at the same time'
      )
    }
    const generatedId = useId()

    id = id || generatedId
    const {
      triggerProps,
      contentProps,
      isOpen: expanded,
    } = useDisclosure({
      defaultOpen: defaultExpanded,
      isOpen: expandedProp,
      onOpenChange: onExpandProp,
      id,
    })

    severity = sanitizeSeverity(severity, {
      default: DEFAULT_SEVERITY,
      allowList: CALLOUT_SEVERITIES,
    })
    const theme = useTheme()

    const text = severityToText[severity]
    const iconColor = theme.colors[severityToIconColorKey[severity]]
    const borderColorKey = severityToBorderColorKey[severity]
    const Icon = severityToIcon[severity]
    const parentFillLevel = useFillLevel()

    fillLevel = toFillLevel(
      Math.max(
        2,
        isFillLevel(fillLevel) && fillLevel >= 0
          ? fillLevel
          : parentFillLevel + 1
      )
    )

    let iconTopMargin = size === 'full' ? 0 : 2

    if (title) {
      iconTopMargin += 2
    }

    if (closed) {
      return null
    }

    return (
      <FillLevelProvider value={fillLevel}>
        <CalloutSC
          className={`${className} ${classNames({ expandable })}`}
          $borderColorKey={borderColorKey}
          $fillLevel={fillLevel}
          $size={size}
          $expanded={expanded}
          ref={ref}
          {...(expandable && !expanded ? triggerProps : {})}
        >
          <div className="icon">
            <Icon
              marginTop={iconTopMargin}
              size={sizeToIconSize[size]}
              color={iconColor}
              display="flex"
            />
          </div>
          <div
            className="content"
            {...(expandable ? contentProps : {})}
          >
            <h6 className={classNames({ visuallyHidden: !title, expandable })}>
              <span className="visuallyHidden">{`${text}: `}</span>
              {title}
            </h6>
            <AnimateHeight
              contentClassName={classNames('body', { bodyWithTitle: !!title })}
              duration={300}
              height={
                (expandable && expanded) || !expandable
                  ? 'auto'
                  : size === 'compact'
                  ? theme.spacing.xsmall
                  : theme.spacing.medium
              }
            >
              <div className="children">{children}</div>
              {buttonProps && (
                <div className="buttonArea">
                  <CalloutButton {...buttonProps} />
                </div>
              )}
            </AnimateHeight>
          </div>
          {(expandable || closeable) && (
            <Flex
              grow={1}
              justify="flex-end"
            >
              <IconFrame
                textValue=""
                display="flex"
                size="small"
                clickable
                {...(closeable && onClose
                  ? {
                      onClick: () => {
                        onClose(!closed)
                      },
                    }
                  : {})}
                {...(expandable && expanded ? triggerProps : {})}
                icon={
                  expandable ? (
                    <CaretDownIcon className="expandIcon" />
                  ) : (
                    <CloseIcon />
                  )
                }
              />
            </Flex>
          )}
        </CalloutSC>
      </FillLevelProvider>
    )
  }
)

const CalloutSC = styled.div<{
  $borderColorKey: string
  $size: CalloutSize
  $fillLevel: FillLevel
  $expanded: boolean
}>(({ theme, $size, $fillLevel, $borderColorKey, $expanded }) => ({
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
  transition: 'background-color 0.2s ease',

  '&.expandable': {
    cursor: $expanded ? 'inherit' : 'pointer',
    paddingBottom: 0,
    ...(!$expanded && {
      '&:hover': {
        backgroundColor:
          $fillLevel >= 3
            ? theme.colors['fill-three-hover']
            : theme.colors['fill-two-hover'],
      },
    }),
    '.body': {
      paddingBottom:
        $size === 'compact' ? theme.spacing.xsmall : theme.spacing.medium,
    },
    '.rah-static--height-specific': {
      opacity: 0,
    },
  },
  h6: {
    ...theme.partials.text.body1Bold,
    color: theme.colors.text,
    margin: 0,
    padding: 0,
  },
  '.bodyWithTitle': {
    paddingTop: theme.spacing.small,
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
  '.children': {
    '& a, & a:any-link': {
      ...theme.partials.text.inlineLink,
    },
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
    background: (theme.colors as any)[$borderColorKey],
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
  '.expandIcon': {
    ...theme.partials.dropdown.arrowTransition({ isOpen: $expanded }),
  },
  // Overrides for light mode
  ...(theme.mode === 'light'
    ? {
        backgroundColor:
          $fillLevel >= 3
            ? theme.colors['fill-zero']
            : theme.colors['fill-one'],
        boxShadow: theme.boxShadows.moderate,
        '&::after': {
          borderRadius: theme.borderRadiuses.medium,
          border:
            $fillLevel >= 3 ? theme.borders['fill-two'] : theme.borders.default,
        },
      }
    : {}),
}))

Callout.propTypes = {
  severity: PropTypes.oneOf(CALLOUT_SEVERITIES),
  title: PropTypes.string,
  size: PropTypes.oneOf(['compact', 'full']),
  fillLevel: PropTypes.oneOf([0, 1, 2, 3]),
  className: PropTypes.string,
}

export default Callout
