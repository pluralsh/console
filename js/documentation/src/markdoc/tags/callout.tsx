import type { ComponentProps, ReactNode } from 'react'

import { markdocComponents, markdocTags } from '@pluralsh/design-system'

import styled from 'styled-components'

import { brand, docsText } from '@src/theme/docsTheme'

type CalloutProps = ComponentProps<typeof markdocComponents.Callout>

const severityAliases: Record<string, CalloutProps['severity']> = {
  warn: 'warning',
  caution: 'warning',
  error: 'danger',
}

const tones = {
  warning: { color: brand.warning, label: 'Warning' },
  danger: { color: brand.danger, label: 'Danger' },
} as const

export const callout = {
  ...markdocTags.callout,
  render: DocsCallout,
  attributes: {
    ...markdocTags.callout.attributes,
    severity: {
      type: String,
      description:
        '"info", "warning" (or "warn"), "danger", "success", or "neutral"',
    },
  },
}

function DocsCallout({
  severity,
  title,
  children,
  ...props
}: CalloutProps & { children?: ReactNode }) {
  const normalized =
    (severity && severityAliases[severity as string]) || severity
  const tone = tones[normalized as keyof typeof tones]
  const callout = (
    <markdocComponents.Callout
      {...props}
      severity={normalized}
      title={title}
    >
      {tone && !title && <ToneLabel aria-hidden>{tone.label}</ToneLabel>}
      {children}
    </markdocComponents.Callout>
  )

  return tone ? <ToneSC $color={tone.color}>{callout}</ToneSC> : callout
}

const ToneLabel = styled.div({
  ...docsText.label,
  color: 'inherit',
  marginBottom: 6,
})

const ToneSC = styled.div<{ $color: string }>(({ $color }) => ({
  '& > div': {
    backgroundColor: `color-mix(in srgb, ${$color} 7%, ${brand.surface})`,
    boxShadow: 'none',
    '&::after': {
      border: `1px solid color-mix(in srgb, ${$color} 32%, transparent)`,
    },
    h6: { color: $color },
    [`${ToneLabel}`]: { color: $color },
    '.children, .children p, .children li': { color: brand.ink },
  },
}))
