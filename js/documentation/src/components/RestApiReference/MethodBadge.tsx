/**
 * HTTP method badge (GET, POST, etc.). API reference specific.
 */

import styled from 'styled-components'

import type { HttpMethod } from '@src/lib/openapi-rest'

export type { HttpMethod }

const METHOD_STYLES: Record<
  HttpMethod,
  { bg: string; border: string; color: string }
> = {
  GET: { bg: '#074F37', border: '#0A6B4A', color: '#99F5D5' },
  POST: { bg: '#004166', border: '#006199', color: '#99DAFF' },
  DELETE: { bg: '#660A19', border: '#8B0E23', color: '#FAC7D0' },
  PATCH: { bg: '#7B341E', border: '#9C4221', color: '#FEEBC8' },
  PUT: { bg: '#553C9A', border: '#6B46C1', color: '#F1F1FE' },
}

const METHOD_LABELS: Record<HttpMethod, string> = {
  GET: 'GET',
  POST: 'POST',
  DELETE: 'DEL',
  PATCH: 'PATCH',
  PUT: 'PUT',
}

const Badge = styled.span<{ $method: HttpMethod }>(({ $method }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '2px 4px',
  borderRadius: 6,
  border: `0.75px solid ${METHOD_STYLES[$method].border}`,
  background: METHOD_STYLES[$method].bg,
  color: METHOD_STYLES[$method].color,
  fontFamily: 'Inter, sans-serif',
  fontSize: 11,
  fontWeight: 400,
  lineHeight: '16px',
  letterSpacing: '1.25px',
  textTransform: 'uppercase' as const,
}))

export function MethodBadge({ method }: { method: HttpMethod }) {
  return <Badge $method={method}>{METHOD_LABELS[method]}</Badge>
}
