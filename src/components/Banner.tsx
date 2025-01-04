import { Div, Flex, type FlexProps, Span, type SpanProps } from 'honorable'
import { type ReactNode } from 'react'
import styled from 'styled-components'

import { type ColorKey, type SeverityExt, sanitizeSeverity } from '../types'

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
  actionProps?: SpanProps
  fullWidth?: boolean
  onClose?: () => void
}

const severityToIconColorKey: Readonly<Record<BannerSeverity, ColorKey>> = {
  info: 'icon-info',
  danger: 'icon-danger',
  warning: 'icon-warning',
  success: 'icon-success',
}

const severityToBorderColorKey: Record<BannerSeverity, ColorKey> = {
  info: 'border-info',
  danger: 'border-danger',
  warning: 'border-warning',
  success: 'border-success',
}

const severityToIcon: Record<BannerSeverity, ReturnType<typeof createIcon>> = {
  info: InfoIcon,
  danger: ErrorIcon,
  warning: WarningIcon,
  success: CheckRoundedIcon,
}

const BannerOuter: any = styled.div<{
  $borderColorKey: ColorKey
  $fullWidth?: boolean
}>(({ $borderColorKey, $fullWidth, theme }) => ({
  display: 'inline-flex',
  align: 'flex-start',
  padding: theme.spacing.medium,
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['fill-zero']
      : theme.colors['fill-three'],
  borderRadius: theme.borderRadiuses.medium,
  borderTop: `3px solid ${theme.colors[$borderColorKey]}`,
  maxWidth: $fullWidth ? undefined : 480,
  width: $fullWidth ? '100%' : undefined,
  boxShadow: theme.boxShadows.moderate,
}))

const BannerInner = styled.div(({ theme }) => ({
  display: 'flex',
  paddingTop: theme.spacing.xxsmall,
  paddingBottom: theme.spacing.xxsmall,
  alignItems: 'flex-start',
}))

const IconWrap = styled.div((_) => ({
  display: 'flex',
  paddingTop: 2,
  paddingBottom: 2,
}))

const Heading = styled.div<{ $bold: boolean }>(({ $bold, theme }) => ({
  ...theme.partials.text.body1,
  ...($bold ? theme.partials.text.bodyBold : {}),
  color: theme.colors.text,
}))

const BannerAction = styled(Span)(({ theme }) => ({
  marginLeft: theme.spacing.small,
  '&, & a, & a:any-link': {
    ...theme.partials.text.inlineLink,
    ...theme.partials.text.bodyBold,
  },
}))

const Content = styled.p<{ $hasHeading: boolean }>(
  ({ $hasHeading: $heading, theme }) => ({
    ...theme.partials.text.body2LooseLineHeight,
    marginTop: $heading ? theme.spacing.xxsmall : theme.spacing.xxxsmall,
    marginBottom: 0,
    color: theme.colors['text-light'],
    '& a, & a:any-link': {
      ...theme.partials.text.inlineLink,
    },
  })
)

const CloseButton = styled(IconFrame)(({ theme }) => ({
  marginLeft: theme.spacing.medium,
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
  const borderColorKey = severityToBorderColorKey[finalSeverity]

  const content = (
    <BannerOuter
      $borderColorKey={borderColorKey}
      $fullWidth={fullWidth}
      as={Flex}
      {...props}
    >
      <BannerInner>
        <IconWrap>
          <BannerIcon
            size={20}
            color={iconColorKey}
            marginRight="medium"
          />
        </IconWrap>
        <div>
          {heading && (
            <Heading $bold={!!children}>
              {heading}
              {action && <BannerAction {...actionProps}>{action}</BannerAction>}
            </Heading>
          )}
          {children && <Content $hasHeading={!!heading}>{children}</Content>}
        </div>
      </BannerInner>
      <Div flexGrow={1} />
      {typeof onClose === 'function' && (
        <CloseButton
          size="medium"
          clickable
          icon={<CloseIcon />}
          onClick={onClose}
        />
      )}
    </BannerOuter>
  )

  return <FillLevelProvider value={3}>{content}</FillLevelProvider>
}

export default Banner
