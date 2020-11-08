import React from 'react'
import { Box, Text } from 'grommet'

export const mapify = (tags) => tags.reduce((acc, {name, value}) => ({...acc, [name]: value}), {})

export function MetadataRow({name, children}) {
  return (
    <Box flex={false} style={{maxHeight: '100px'}} border='bottom' direction='row'
         gap='small' pad={{vertical: 'xsmall'}} align='center'>
      <Box flex={false} width='10%'>
        <Text size='small' weight='bold'>{name}</Text>
      </Box>
      <Box style={{maxHeight: '100px', overflow: 'auto'}} fill='horizontal' direction='row' wrap>
        {children}
      </Box>
    </Box>
  )
}

function MetadataTag({name, value}) {
  return (
    <Box round='xsmall' direction='row' gap='xsmall' pad={{vertical: 'xxsmall', horizontal: 'xsmall'}} margin={{right: 'xsmall'}} background='backgroundLight'>
      <Text size='small' weight={500}>{name}:</Text>
      <Text size='small'>{value}</Text>
    </Box>
  )
}

export function Metadata({metadata: {name, namespace, labels, annotations}}) {
  return (
    <Box flex={false} pad='small'>
      <Box>
        <Text size='small'>Metadata</Text>
      </Box>
      <MetadataRow name='name'>
        <Text size='small'>{name}</Text>
      </MetadataRow>
      <MetadataRow name='namespace'>
        <Text size='small'>{namespace}</Text>
      </MetadataRow>
      <MetadataRow name='labels'>
        {labels.map(({name, value}) => <MetadataTag key={name} name={name} value={value} />)}
      </MetadataRow>
      <MetadataRow name='annotations'>
        {annotations.map(({name, value}) => <MetadataTag key={name} name={name} value={value} />)}
      </MetadataRow>
    </Box>
  )
}