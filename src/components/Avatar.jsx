import { Box, Text } from 'grommet'
import styled from 'styled-components'

const Wrapper = styled(Box)`
  width: 44px;
  height: 44px;
  border-radius: 2px;
`

function extractInitials(name) {
  const words = name.split(' ')

  // Pick the first and last initials if any
  return words.map(word => word[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase()
}

function Avatar({ name, ...props }) {
  return (
    <Wrapper
      background="accent-blue"
      justify="center"
      align="center"
      {...props}
    >
      <Text
        size="large"
        weight="bold"
      >
        {extractInitials(name)}
      </Text>
    </Wrapper>
  )
}

export default Avatar
