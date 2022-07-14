import React from 'react'
import { Box, Text, TextInput } from 'grommet'

export function SuffixedInput({ suffix, value, onChange, placeholder }) {

  return (
    <Box
      direction="row"
      align="center"
    >
      <TextInput
        weight={450}
        value={value}
        placeholder={placeholder}
        onChange={({ target: { value } }) => onChange(value)}
      />
      <Box
        flex={false}
        style={{ borderLeftStyle: 'none' }}
        border={{ color: 'light-5' }} 
        pad={{ horizontal: 'small' }}
        background="tone-light"
        height="37px"
        justify="center"
      >
        <Text
          size="small"
          weight={500}
        >{suffix}
        </Text>
      </Box>
    </Box>
  )
}
