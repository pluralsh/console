import React from 'react'
import { Box, Text } from 'grommet'

export function MetadataRow({name, children}) {
  return (
    <Box flex={false} border='bottom' direction='row' gap='small' pad={{vertical: 'xxsmall'}}>
      <Box flex={false} width='10%'>
        <Text size='small' weight='bold'>{name}</Text>
      </Box>
      <Box fill='horizontal' direction='row' wrap>
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

export function Metadata({metadata: {name, labels, annotations}}) {
  return (
    <Box pad='small'>
      <Box margin={{bottom: 'small'}}>
        <Text size='small'>Metadata</Text>
      </Box>
      <MetadataRow name='name'>
        <Text size='small'>{name}</Text>
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