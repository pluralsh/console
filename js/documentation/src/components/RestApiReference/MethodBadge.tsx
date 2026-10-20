/**
 * HTTP method badge (GET, POST, etc.). API reference specific.
 */

import styled from 'styled-components'

import type { HttpMethod } from '@src/lib/openapi-rest'
import { brand } from '@src/theme/docsTheme'

export type { HttpMethod }

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: brand.success,
  POST: brand['accent-ink'],
  DELETE: brand.danger,
  PATCH: brand.warning,
  PUT: brand.violet,
}

const tint = (color: string, percent: number) =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`

const METHOD_LABELS: Record<HttpMethod, string> = {
  GET: 'GET',
  POST: 'POST',
  DELETE: 'DEL',
  PATCH: 'PATCH',
  PUT: 'PUT',
}

const Badge = styled.span<{ $method: HttpMethod }>(({ theme, $method }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '2px 6px',
  borderRadius: 4,
  border: `1px solid ${tint(METHOD_COLORS[$method], 18)}`,
  background: tint(METHOD_COLORS[$method], 10),
  color: METHOD_COLORS[$method],
  fontFamily: theme.fontFamilies.mono,
  fontVariantLigatures: 'none',
  fontSize: 10,
  fontWeight: 500,
  lineHeight: '16px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
}))

export function MethodBadge({ method }: { method: HttpMethod }) {
  return <Badge $method={method}>{METHOD_LABELS[method]}</Badge>
}
