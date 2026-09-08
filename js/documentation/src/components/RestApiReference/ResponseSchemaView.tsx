/**
 * Renders response schemas as a flat table matching the ParameterTable style.
 * Nested properties are indented; no collapsible sections.
 */

import { useEffect, useState } from 'react'

import isEmpty from 'lodash/isEmpty'
import styled from 'styled-components'

import {
  StatusDot,
  StatusTab,
  StatusTabs,
  Table,
  Td,
  TdLight,
  Th,
  TypeTag,
  getStatusColor,
} from './shared'

import type { ResponseSchemaInfo, SchemaProperty } from '@src/lib/openapi-rest'

/* ─── Styled Components ──────────────────────────────────────────────────── */

const SchemaContainer = styled.div(({ theme }) => ({
  marginBottom: theme.spacing.large,
}))

const FallbackText = styled.p(({ theme }) => ({
  color: theme.colors['text-light'],
}))

const SchemaHeader = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  marginBottom: theme.spacing.medium,
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
}))

const ContentTypeBadge = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-light'],
  background: theme.colors['fill-one'],
  padding: '2px 8px',
  borderRadius: theme.borderRadiuses.medium,
  fontFamily: 'Monument Semi-Mono, monospace',
}))

const EnumBadge = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  fontFamily: 'Monument Semi-Mono, monospace',
  color: theme.colors['text-light'],
  background: theme.colors['fill-two'],
  padding: '1px 6px',
  borderRadius: theme.borderRadiuses.medium,
  border: `1px solid ${theme.colors.border}`,
}))

const EnumWrap = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  flexWrap: 'wrap' as const,
  marginTop: 4,
}))

const EnumLabel = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
}))

const NameWrap = styled.span<{ $depth: number }>(({ $depth }) => ({
  paddingLeft: $depth * 16,
  display: 'inline-flex',
  alignItems: 'center',
}))

/* ─── Helpers ────────────────────────────────────────────────────────────── */

interface FlatRow {
  key: string
  name: string
  type: string
  description: string | null | undefined
  depth: number
  enum?: string[]
  format?: string
}

function flattenProperties(
  props: SchemaProperty[],
  depth: number,
  prefix: string
): FlatRow[] {
  const rows: FlatRow[] = []

  for (const prop of props) {
    const key = prefix ? `${prefix}.${prop.name}` : prop.name
    const isArray = prop.type === 'array'

    let { type } = prop

    if (isArray && prop.arrayItemType) {
      type = `Array<${prop.arrayItemType}>`
    } else if (isArray) {
      type = 'array'
    }
    if (prop.format) {
      type = `${type} <${prop.format}>`
    }

    rows.push({
      key,
      name: prop.name,
      type,
      description: prop.description,
      depth,
      enum: prop.enum,
      format: prop.format,
    })

    const children = prop.arrayItemProperties ?? prop.properties

    if (children && !isEmpty(children)) {
      rows.push(...flattenProperties(children, depth + 1, key))
    }
  }

  return rows
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export function ResponseSchemaView({
  schemas,
}: {
  schemas: ResponseSchemaInfo[]
}) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex((prev) =>
      isEmpty(schemas) ? 0 : Math.min(prev, schemas.length - 1)
    )
  }, [schemas])

  if (isEmpty(schemas)) {
    return (
      <SchemaContainer>
        <FallbackText>No response schema available.</FallbackText>
      </SchemaContainer>
    )
  }

  const safeIndex = Math.min(selectedIndex, schemas.length - 1)
  const selected = schemas[safeIndex]

  if (!selected) return null

  const rows = flattenProperties(selected.properties, 0, '')

  return (
    <SchemaContainer>
      {schemas.length > 1 && (
        <StatusTabs>
          {schemas.map((s, i) => (
            <StatusTab
              key={s.statusLabel}
              $active={i === safeIndex}
              onClick={() => setSelectedIndex(i)}
              type="button"
            >
              <StatusDot $color={getStatusColor(s.status)} />
              {s.statusLabel}
            </StatusTab>
          ))}
        </StatusTabs>
      )}

      <SchemaHeader>
        <span>Response schema:</span>
        <ContentTypeBadge>{selected.contentType}</ContentTypeBadge>
      </SchemaHeader>

      {!isEmpty(rows) ? (
        <Table>
          <thead>
            <tr>
              <Th>Parameter</Th>
              <Th>Type</Th>
              <Th>Description</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <Td>
                  <NameWrap $depth={row.depth}>
                    <code>{row.name}</code>
                  </NameWrap>
                </Td>
                <Td>
                  <TypeTag>{row.type}</TypeTag>
                </Td>
                <TdLight>
                  {row.description ?? '—'}
                  {!isEmpty(row.enum) && (
                    <EnumWrap>
                      <EnumLabel>Enum:</EnumLabel>
                      {(row.enum ?? []).map((v) => (
                        <EnumBadge key={v}>{`"${v}"`}</EnumBadge>
                      ))}
                    </EnumWrap>
                  )}
                </TdLight>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <FallbackText>
          {selected.description ?? 'No schema details available.'}
        </FallbackText>
      )}
    </SchemaContainer>
  )
}
