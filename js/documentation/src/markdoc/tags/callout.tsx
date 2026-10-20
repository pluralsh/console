import type { ComponentType, ReactNode } from 'react'

import {
  ErrorIcon,
  InfoOutlineIcon,
  MagicWandIcon,
  markdocTags,
  TestTubeIcon,
  WarningIcon,
} from '@pluralsh/design-system'

import styled from 'styled-components'

import { brand, docsText } from '@src/theme/docsTheme'

type DocsSeverity = 'info' | 'tip' | 'warning' | 'danger' | 'beta'

type CalloutProps = {
  severity?: string
  title?: ReactNode
  children?: ReactNode
}

const severityAliases: Record<string, DocsSeverity> = {
  warn: 'warning',
  caution: 'warning',
  error: 'danger',
  success: 'tip',
  neutral: 'beta',
}

const variants: Record<
  DocsSeverity,
  {
    color: string
    label: string
    Icon: ComponentType<{ size?: number; color?: string }>
  }
> = {
  info: { color: brand.violet, label: 'Info', Icon: InfoOutlineIcon },
  tip: { color: brand.success, label: 'Tip', Icon: MagicWandIcon },
  warning: { color: brand.warning, label: 'Warning', Icon: WarningIcon },
  danger: { color: brand.danger, label: 'Danger', Icon: ErrorIcon },
  beta: { color: brand.muted, label: 'Beta', Icon: TestTubeIcon },
}

export const callout = {
  ...markdocTags.callout,
  render: DocsCallout,
  attributes: {
    ...markdocTags.callout.attributes,
    severity: {
      type: String,
      description:
        '"info", "tip" (or "success"), "warning" (or "warn"), "danger" (or "error"), or "beta" (or "neutral")',
    },
  },
}

function DocsCallout({ severity = 'info', title, children }: CalloutProps) {
  const normalized =
    severityAliases[severity] ||
    (severity in variants ? (severity as DocsSeverity) : 'info')
  const { color, label, Icon } = variants[normalized]

  return (
    <CalloutSC
      $color={color}
      role="note"
      aria-label={label}
    >
      <Header>
        <IconWrap $color={color}>
          <Icon
            size={16}
            color="currentColor"
          />
        </IconWrap>
        <Label style={{ color }}>{label}</Label>
      </Header>
      {title ? <Title>{title}</Title> : null}
      {children ? <Body className="children">{children}</Body> : null}
    </CalloutSC>
  )
}

const CalloutSC = styled.aside<{ $color: string }>(({ theme, $color }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  margin: `${theme.spacing.large}px 0`,
  padding: `${theme.spacing.medium}px`,
  borderRadius: theme.borderRadiuses.medium,
  backgroundColor: `color-mix(in srgb, ${$color} var(--callout-tint), ${brand.surface})`,
  border: `1px solid color-mix(in srgb, ${$color} var(--callout-border), transparent)`,
  boxShadow: 'none',
}))

const Header = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
}))

const IconWrap = styled.span<{ $color: string }>(({ $color }) => ({
  display: 'inline-flex',
  flexShrink: 0,
  color: $color,
}))

const Label = styled.div({
  ...docsText.label,
})

const Title = styled.div(({ theme }) => ({
  ...theme.partials.marketingText.body2Bold,
  color: brand.ink,
  margin: 0,
}))

const Body = styled.div(({ theme }) => ({
  ...theme.partials.marketingText.body2,
  color: brand.ink,
  '&, & p, & li': {
    color: brand.ink,
    margin: 0,
  },
  '& p + p, & ul, & ol': {
    marginTop: theme.spacing.small,
  },
  '& a, & a:any-link': {
    ...theme.partials.marketingText.inlineLink,
  },
  '& code': {
    ...theme.partials.text.inlineCode,
  },
  '& *:first-child': {
    marginTop: 0,
  },
  '& *:last-child': {
    marginBottom: 0,
  },
}))
