import type { ReactNode } from 'react'

import styled from 'styled-components'

import { brand, docsText } from '@src/theme/docsTheme'

export const hierarchy = {
  render: Hierarchy,
  attributes: {
    label: { type: String },
  },
  description: 'Render a resource tree as a mono panel, one row per node',
  example: `
  {% hierarchy label="Ownership · permissions flow down" %}
  {% hierarchy-node depth=0 name="Project" detail="RBAC root" /%}
  {% hierarchy-node depth=1 name="Cluster" detail="Kubernetes" /%}
  {% /hierarchy %}
  `,
}

export const hierarchyNode = {
  render: HierarchyNode,
  selfClosing: true,
  attributes: {
    depth: { type: Number, default: 0 },
    name: { type: String, required: true },
    detail: { type: String },
  },
}

function Hierarchy({
  label,
  children,
}: {
  label?: string
  children: ReactNode
}) {
  return (
    <Panel>
      {label && <Label>{label}</Label>}
      {children}
    </Panel>
  )
}

function HierarchyNode({
  depth = 0,
  name,
  detail,
}: {
  depth?: number
  name: string
  detail?: string
}) {
  return (
    <Row style={{ paddingLeft: depth * 22 }}>
      <span>
        {depth > 0 && <span className="muted">└ </span>}
        <span className="name">{name}</span>
      </span>
      {detail && <span className="muted">{detail}</span>}
    </Row>
  )
}

const Panel = styled.div(({ theme }) => ({
  margin: `${theme.spacing.medium} 0 ${theme.spacing.large}`,
  padding: 20,
  border: `1px solid ${brand['line-strong']}`,
  borderRadius: 4,
  background: brand.surface,
  fontFamily: theme.fontFamilies.mono,
  fontVariantLigatures: 'none',
  fontSize: 13,
  lineHeight: 1.625,
}))

const Label = styled.div({
  ...docsText.label,
  marginBottom: 12,
})

const Row = styled.div({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '10px 0',
  borderBottom: `1px solid ${brand.line}`,
  '&:last-child': { borderBottom: 'none' },
  '.name': { color: brand.ink },
  '.muted': { color: brand.muted },
})
