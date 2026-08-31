import styled from 'styled-components'

export const BasicLink = styled.a((_) => ({
  textDecoration: 'unset',
  color: 'unset',
  '&:hover': {
    textDecoration: 'underline',
  },
  '&:focus, &:focus-visible': {
    outline: 'none',
    textDecoration: 'underline',
  },
}))
