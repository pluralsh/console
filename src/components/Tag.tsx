import { Box, BoxExtendedProps, Text } from 'grommet'
import styled from 'styled-components'

type TagProps = BoxExtendedProps

const propTypes = {}

const Wrapper = styled(Box)`
  display: inline-flex;
  height: 28px;
  border-radius: 14px;
`

function Tag({ children, ...props }: TagProps) {
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

Tag.propTypes = propTypes

export default Tag
