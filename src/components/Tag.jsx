import { Box, Text } from 'grommet'
import styled from 'styled-components'

const Wrapper = styled(Box)`
  display: inline-flex;
  height: 28px;
  border-radius: 14px;
`

function Tag({ children, ...props }) {
  return (
    <Wrapper
      background="background-light"
      pad={{ horizontal: '8px' }}
      align="center"
      justify="center"
      {...props}
    >
      <Text size="small">
        {children}
      </Text>
    </Wrapper>
  )
}

Tag.propTypes = Box.propTypes
Tag.defaultProps = Box.defaultProps

export default Tag
