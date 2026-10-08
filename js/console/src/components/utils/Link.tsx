import { Link } from 'react-router-dom'
import styled from 'styled-components'

export const UnstyledLink = styled(Link)<{ $extendStyle?: object }>(
  ({ theme, $extendStyle }) => ({
    textDecoration: 'none',
    color: 'inherit',
    '&:focus, &:focus-visible': {
      outline: 'none',
      color: 'inherit',
    },
    '&:focus-visible': {
      ...theme.partials.focus.default,
    },
    ...$extendStyle,
  })
)
