import { Link } from 'react-router-dom'
import styled from 'styled-components'

export const UnstyledLink = styled(Link)<{ $extendStyle?: object }>(
  ({ $extendStyle }) => ({
    textDecoration: 'none',
    ...$extendStyle,
  })
)
