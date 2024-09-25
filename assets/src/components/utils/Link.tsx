import { Link } from 'react-router-dom'
import styled from 'styled-components'

type UnstyledLinkProps = { $extendStyle?: object }

const unstyledStyles = ({ $extendStyle }: UnstyledLinkProps) => ({
  textDecoration: 'none',
  ...$extendStyle,
})

export const UnstyledLink = styled(Link)(unstyledStyles)
