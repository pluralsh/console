/**
 * Shared styled components and helpers used across REST API reference panels.
 */

import styled from 'styled-components'

// ─── Status colors ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<number, string> = {
  200: '#3DD68C',
  201: '#3DD68C',
  400: '#FF8B3E',
  401: '#FF8B3E',
  403: '#FF8B3E',
  404: '#FF8B3E',
  422: '#FF8B3E',
  500: '#FF6369',
  502: '#FF6369',
  503: '#FF6369',
}

export function getStatusColor(status: number): string {
  if (STATUS_COLORS[status]) return STATUS_COLORS[status]
  if (status >= 200 && status < 300) return '#3DD68C'
  if (status >= 400 && status < 500) return '#FF8B3E'
  if (status >= 500) return '#FF6369'

  return '#9E8CFC'
}

// ─── Status tabs ─────────────────────────────────────────────────────────────

export const StatusTabs = styled.div(({ theme }) => ({
  display: 'flex',
  gap: 0,
  borderBottom: theme.borders.default,
  marginBottom: theme.spacing.medium,
}))

export const StatusTab = styled.button<{ $active: boolean }>(
  ({ theme, $active }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xsmall,
    padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
    background: 'transparent',
    border: 'none',
    borderBottom: $active
      ? `2px solid ${theme.colors.text}`
      : '2px solid transparent',
    marginBottom: -1,
    cursor: 'pointer',
    ...theme.partials.text.body2Bold,
    color: $active ? theme.colors.text : theme.colors['text-light'],
    '&:hover': { color: theme.colors.text },
  })
)

export const StatusDot = styled.span<{ $color: string }>(({ $color }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: $color,
  flexShrink: 0,
}))

// ─── Table primitives ────────────────────────────────────────────────────────

export const Table = styled.table(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: theme.spacing.large,
  ...theme.partials.text.body2,
}))

export const Th = styled.th(({ theme }) => ({
  textAlign: 'left',
  padding: `${theme.spacing.small}px 0`,
  borderBottom: theme.borders.default,
  color: theme.colors['text-light'],
  fontWeight: 500,
}))

export const Td = styled.td(({ theme }) => ({
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px ${theme.spacing.small}px 0`,
  borderBottom: theme.borders.default,
  color: theme.colors.text,
  verticalAlign: 'top',
}))

export const TypeTag = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  background: theme.colors['fill-one'],
  padding: '2px 6px',
  borderRadius: theme.borderRadiuses.medium,
}))

export const TdLight = styled(Td)(({ theme }) => ({
  color: theme.colors['text-light'],
}))
