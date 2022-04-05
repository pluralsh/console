import { Box, Text } from 'grommet'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import CloseIcon from './icons/CloseIcon'

const Container = styled(Box)`
  display: inline-flex;
  min-height: 28px;
`
const IconContainer = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  cursor: pointer;
`

export default function Token({ children, onClose, ...props }) {

  return (
    <Container
      background="background-light"
      direction="row"
      align="center"
      round="4px"
      pad={{ horizontal: '8px' }}
      {...props}
    >
      <Text
        size="small"
      >
        {children}
      </Text>
      <IconContainer onClick={onClose}>
        <CloseIcon size={8} />
      </IconContainer>
    </Container>
  )
}

Token.propTypes = {
  children: PropTypes.node.isRequired,
  onClose: PropTypes.func,
}

Token.defaultProps = {
  onClose: () => null,
}
