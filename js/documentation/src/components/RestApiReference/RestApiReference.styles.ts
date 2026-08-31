import styled from 'styled-components'

// ─── Content layout (uses shared PageGrid from PageGrid.tsx) ───────────────────

export const RestContentWrapper = styled.div(({ theme }) => ({
  marginTop: theme.spacing.xlarge,
  padding: `0 ${theme.spacing.xlarge}px`,
}))

export const BreadcrumbsWrapper = styled.div(({ theme }) => ({
  marginTop: theme.spacing.xlarge,
  marginBottom: theme.spacing.large,
}))

export const ContentGrid = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: theme.spacing.xlarge,
  alignItems: 'start',
  '@media (max-width: 900px)': {
    gridTemplateColumns: '1fr',
  },
}))

// ─── Endpoint header ─────────────────────────────────────────────────────────

export const EndpointTitleRow = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  marginBottom: theme.spacing.large,
}))

export const EndpointName = styled.h2(({ theme }) => ({
  ...theme.partials.text.title2,
  margin: 0,
  color: theme.colors.text,
}))

export const PathGroup = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
}))

export const EndpointPath = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  fontFamily: 'Monument Semi-Mono, monospace',
}))

export const PageDescription = styled.p(({ theme }) => ({
  ...theme.partials.marketingText.body1,
  color: theme.colors['text-light'],
  margin: 0,
  marginBottom: theme.spacing.xlarge,
  maxWidth: 760,
}))

// ─── Copy button ─────────────────────────────────────────────────────────────

export const CopyIconButton = styled.button(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: theme.colors['text-xlight'],
  padding: 0,
  borderRadius: theme.borderRadiuses.medium,
  '&:hover': {
    color: theme.colors.text,
    background: theme.colors['fill-one'],
  },
}))

export const CopyIconWrapper = styled.span<{ $visible: boolean }>(
  ({ $visible }) => ({
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: $visible ? 1 : 0,
    transform: $visible ? 'scale(1)' : 'scale(0.5)',
    transition:
      'opacity 0.3s ease-in-out, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    pointerEvents: 'none',
  })
)

// ─── Tabs ────────────────────────────────────────────────────────────────────

export const TabBar = styled.div(({ theme }) => ({
  display: 'flex',
  gap: 0,
  marginBottom: theme.spacing.xlarge,
}))

// ─── Auth page ───────────────────────────────────────────────────────────────

export const AuthContent = styled.div({
  maxWidth: 760,
})

export const AuthTitle = styled.h1(({ theme }) => ({
  ...theme.partials.text.title1,
  margin: 0,
  marginBottom: theme.spacing.medium,
  color: theme.colors.text,
}))

export const AuthBody = styled.div(({ theme }) => ({
  ...theme.partials.text.body1,
  color: theme.colors['text-light'],
  lineHeight: 1.7,
  p: {
    margin: `${theme.spacing.medium}px 0`,
  },
  ol: {
    paddingLeft: theme.spacing.xlarge,
    margin: `${theme.spacing.medium}px 0`,
  },
  li: {
    marginBottom: theme.spacing.xsmall,
  },
  code: {
    ...theme.partials.text.inlineCode,
    backgroundColor: theme.colors['fill-two'],
    padding: `2px ${theme.spacing.xxsmall}px`,
    borderRadius: theme.borderRadiuses.medium,
  },
  a: {
    color: theme.colors['action-link-inline'],
    textDecoration: 'none',
    '&:hover': { textDecoration: 'underline' },
  },
}))
