import { PropsWithChildren } from 'react'
import { Box, Text } from 'grommet'
import styled from 'styled-components'
import PropTypes from 'prop-types'

import CloseIcon from './icons/CloseIcon'

type TokenProps = PropsWithChildren<{
  onClose?: () => void
}>

const propTypes = {
  onClose: PropTypes.func,
}

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

function Token({ children, onClose = () => {}, ...props }: TokenProps) {

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

Token.propTypes = propTypes

export default Token
