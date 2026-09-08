/**
 * API parameter table. Displays name, type, required, description.
 */

import isEmpty from 'lodash/isEmpty'
import styled from 'styled-components'

import { Table, Td, TdLight, Th, TypeTag } from './shared'

import type { Parameter } from '@src/lib/openapi-rest'

const RequiredBadge = styled.span(() => ({
  fontSize: 10,
  fontWeight: 600,
  color: '#FF6369',
  marginLeft: 8,
}))

export function ParameterTable({ parameters }: { parameters: Parameter[] }) {
  if (isEmpty(parameters)) return null

  return (
    <Table>
      <thead>
        <tr>
          <Th>Parameter</Th>
          <Th>Type</Th>
          <Th>Description</Th>
        </tr>
      </thead>
      <tbody>
        {parameters.map((param, index) => (
          <tr key={`${param.kind ?? 'unknown'}-${param.name}-${index}`}>
            <Td>
              <code>{param.name}</code>
              {param.required && <RequiredBadge>required</RequiredBadge>}
            </Td>
            <Td>
              <TypeTag>{param.type}</TypeTag>
            </Td>
            <TdLight>{param.description ?? '—'}</TdLight>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
