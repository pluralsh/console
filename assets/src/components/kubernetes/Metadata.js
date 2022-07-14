import React from 'react'
import { Box, Text } from 'grommet'

import { Container } from './utils'

export const mapify = tags => tags.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {})

export function MetadataRow({ name, children, final }) {
  return (
    <Box
      flex={false}
      style={{ maxHeight: '100px' }}
      border={final ? null : 'bottom'}
      direction="row"
      gap="small"
      pad={{ vertical: 'xsmall' }}
      align="center"
    >
      <Box
        flex={false}
        width="120px"
      >
        <Text
          size="small"
          weight="bold"
        >{name}
        </Text>
      </Box>
      <Box
        style={{ maxHeight: '100px', overflow: 'auto' }}
        fill="horizontal"
        direction="row"
        wrap
      >
        {children}
      </Box>
    </Box>
  )
}

export function MetadataTag({ name, value, background }) {
  return (
    <Box
      round="xsmall"
      direction="row"
      gap="xsmall"
      pad={{ vertical: 'xxsmall', horizontal: 'xsmall' }}
      margin={{ right: 'xsmall' }}
      background={background || 'backgroundLight'}
    >
      <Text
        size="small"
        weight={500}
      >{name}:
      </Text>
      <Text size="small">{value}</Text>
    </Box>
  )
}

export function Metadata({ metadata: { name, namespace, labels, annotations } }) {
  return (
    <Container header="Metadata">
      <MetadataRow name="name">
        <Text size="small">{name}</Text>
      </MetadataRow>
      {namespace && (
        <MetadataRow name="namespace">
          <Text size="small">{namespace}</Text>
        </MetadataRow>
      )}
      <MetadataRow name="labels">
        {labels.map(({ name, value }) => (
          <MetadataTag
            key={name}
            name={name}
            value={value}
          />
        ))}
      </MetadataRow>
      <MetadataRow
        name="annotations"
        final
      >
        {annotations.map(({ name, value }) => (
          <MetadataTag
            key={name}
            name={name}
            value={value}
          />
        ))}
      </MetadataRow>
    </Container>
  )
}
