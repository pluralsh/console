import Flex, { type FlexProps } from './Flex'
import { type ComponentProps, type ReactNode } from 'react'
import styled from 'styled-components'

import { type SeverityExt, sanitizeSeverity } from '../types'

import { SemanticColorKey } from '../theme/colors'
import { blue, green, red, yellow } from '../theme/colors-base'
import { FillLevelProvider } from './contexts/FillLevelContext'
import IconFrame from './IconFrame'
import CheckRoundedIcon from './icons/CheckRoundedIcon'
import CloseIcon from './icons/CloseIcon'
import type createIcon from './icons/createIcon'
import ErrorIcon from './icons/ErrorIcon'
import InfoIcon from './icons/InfoIcon'
import WarningIcon from './icons/WarningIcon'

export const BANNER_SEVERITIES = [
  'info',
  'warning',
  'success',
  'danger',
] as const satisfies Readonly<SeverityExt[]>

type BannerSeverity = Extract<SeverityExt, (typeof BANNER_SEVERITIES)[number]>
const DEFAULT_SEVERITY: BannerSeverity = 'success'

export type BannerProps = FlexProps & {
  severity?: BannerSeverity | 'error'
  heading?: ReactNode
  action?: ReactNode
  actionProps?: ComponentProps<'span'>
  fullWidth?: boolean
  onClose?: () => void
}

const severityToIconColorKey: Readonly<
  Record<BannerSeverity, SemanticColorKey>
> = {
  info: 'icon-info',
  danger: 'icon-danger',
  warning: 'icon-warning',
  success: 'icon-success',
}

const severityToPalette = {
  info: blue,
  danger: red,
  warning: yellow,
  success: green,
} as const satisfies Record<
  BannerSeverity,
  {
    readonly 50: string
    readonly 200: string
    readonly 800: string
    readonly 850: string
  }
>

const severityToIcon: Record<BannerSeverity, ReturnType<typeof createIcon>> = {
  info: InfoIcon,
  danger: ErrorIcon,
  warning: WarningIcon,
  success: CheckRoundedIcon,
}

const TOAST_SHADOW =
  '2px 3px 6px 0px rgba(14, 16, 21, 0.35), 2px 3px 24px 0px rgba(14, 16, 21, 0.6)'

const BannerOuter = styled(Flex)<{
  $severity: BannerSeverity
  $fullWidth?: boolean
  $compact: boolean
}>(({ $severity, $fullWidth, $compact, theme }) => {
  const palette = severityToPalette[$severity]
  const light = theme.mode === 'light'

  return {
    display: 'inline-flex',
    alignItems: $compact ? 'center' : 'flex-start',
    gap: theme.spacing.medium,
    padding: $compact
      ? `${theme.spacing.small}px ${theme.spacing.large}px`
      : theme.spacing.medium,
    backgroundColor: light ? palette[50] : palette[850],
    border: `1.5px solid ${light ? palette[200] : palette[800]}`,
    borderRadius: 8,
    color: theme.colors.text,
    maxWidth: $fullWidth ? undefined : 480,
    width: $fullWidth ? '100%' : 'fit-content',
    boxShadow: light ? theme.boxShadows.moderate : TOAST_SHADOW,
  }
})

const BannerInner = styled.div<{ $compact: boolean }>(
  ({ $compact, theme }) => ({
    display: 'flex',
    alignItems: $compact ? 'center' : 'flex-start',
    gap: $compact ? theme.spacing.small : theme.spacing.medium,
    flex: '1 1 auto',
    minWidth: 0,
  })
)

const IconWrap = styled.div<{ $compact: boolean }>(({ $compact }) => ({
  display: 'flex',
  flexShrink: 0,
  alignItems: 'center',
  paddingTop: $compact ? 0 : 2,
}))

const Copy = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: theme.spacing.xxsmall,
  minWidth: 0,
}))

const Heading = styled.div<{ $bold: boolean }>(({ $bold, theme }) => ({
  ...theme.partials.text.body1,
  ...($bold ? theme.partials.text.bodyBold : {}),
  color: theme.colors.text,
  '& a, & a:any-link': {
    ...theme.partials.text.inlineLink,
  },
}))

const BannerAction = styled.span(({ theme }) => ({
  marginLeft: theme.spacing.small,
  '&, & a, & a:any-link': {
    ...theme.partials.text.inlineLink,
    ...theme.partials.text.bodyBold,
  },
}))

const Content = styled.p(({ theme }) => ({
  ...theme.partials.text.body2,
  margin: 0,
  color: theme.colors['text-light'],
  '& a, & a:any-link': {
    ...theme.partials.text.inlineLink,
  },
}))

const CloseButton = styled(IconFrame)(() => ({
  flexShrink: 0,
}))

function Banner({
  heading,
  action,
  actionProps,
  children,
  severity = 'success',
  fullWidth = false,
  onClose,
  ...props
}: BannerProps) {
  const finalSeverity = sanitizeSeverity(severity, {
    allowList: BANNER_SEVERITIES,
    default: DEFAULT_SEVERITY,
  })

  const BannerIcon = severityToIcon[finalSeverity]
  const iconColorKey = severityToIconColorKey[finalSeverity]
  const compact = !(heading && children)
  const title = heading || children

  return (
    <FillLevelProvider value={3}>
      <BannerOuter
        $severity={finalSeverity}
        $fullWidth={fullWidth}
        $compact={compact}
        {...props}
      >
        <BannerInner $compact={compact}>
          <IconWrap $compact={compact}>
            <BannerIcon
              size={20}
              color={iconColorKey}
            />
          </IconWrap>
          <Copy>
            {title && (
              <Heading $bold={!compact}>
                {title}
                {action && (
                  <BannerAction {...actionProps}>{action}</BannerAction>
                )}
              </Heading>
            )}
            {!compact && children && <Content>{children}</Content>}
          </Copy>
        </BannerInner>
        {typeof onClose === 'function' && (
          <CloseButton
            size="medium"
            clickable
            textValue="Dismiss"
            icon={<CloseIcon />}
            onClick={onClose}
          />
        )}
      </BannerOuter>
    </FillLevelProvider>
  )
}

export default Banner
