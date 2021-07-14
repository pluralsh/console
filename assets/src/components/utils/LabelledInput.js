import React from 'react'
import { Box, Text, TextInput } from 'grommet'

export function LabelledInput({label, value, onChange, placeholder, width, type, modifier}) {
  return (
    <Box gap='xsmall' width={width || '300px'}>
      <Box direction='row' align='center'>
        <Box fill='horizontal'>
          <Text size='small' color='dark-4'>{label}</Text>
        </Box>
        <Box flex={false}>
          {modifier}
        </Box>
      </Box>
      <TextInput
        name={label}
        type={type}
        value={value || ''}
        onChange={onChange && (({target: {value}}) => onChange(value))}
        placeholder={placeholder} />
    </Box>
  )
}