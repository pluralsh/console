/**
 * Shared styled components and helpers used across REST API reference panels.
 */

import type { ComponentPropsWithoutRef } from 'react'

import styled from 'styled-components'

import { brand } from '@src/theme/docsTheme'

// ─── Status colors ───────────────────────────────────────────────────────────

export function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return brand.success
  if (status >= 400 && status < 500) return brand.warning
  if (status >= 500) return brand.danger

  return brand.violet
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
    ...theme.partials.text.body2,
    fontWeight: 500,
    color: $active ? brand.ink : brand.muted,
    '&:hover': { color: brand.ink },
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

const tableLine = '1px solid var(--table-line)'

// The stroke sits on the frame so it follows the corner. A collapsed table
// ignores its own radius, and clipping that square stroke leaves a notch.
const TableFrame = styled.div(({ theme }) => ({
  borderRadius: theme.borderRadiuses.large,
  overflow: 'hidden',
  marginBottom: theme.spacing.large,
  border: tableLine,
}))

const TableEl = styled.table(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  background: 'transparent',
  ...theme.partials.text.body2,
  'tbody tr:nth-child(even) td': {
    backgroundColor: 'var(--table-stripe)',
  },
}))

export function Table(props: ComponentPropsWithoutRef<'table'>) {
  return (
    <TableFrame>
      <TableEl {...props} />
    </TableFrame>
  )
}

export const Th = styled.th(({ theme }) => ({
  textAlign: 'left',
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  border: 'none',
  borderRight: tableLine,
  borderBottom: tableLine,
  background: 'var(--table-header)',
  color: brand.ink,
  fontWeight: 500,
  '&:last-child': { borderRight: 'none' },
}))

export const Td = styled.td(({ theme }) => ({
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  border: 'none',
  borderRight: tableLine,
  borderBottom: tableLine,
  color: theme.colors.text,
  verticalAlign: 'top',
  '&:last-child': { borderRight: 'none' },
  'tr:last-child &': { borderBottom: 'none' },
}))

export const TypeTag = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  fontFamily: theme.fontFamilies.mono,
  fontVariantLigatures: 'none',
  color: brand.ink,
}))

export const TdLight = styled(Td)(({ theme }) => ({
  color: theme.colors['text-light'],
}))
