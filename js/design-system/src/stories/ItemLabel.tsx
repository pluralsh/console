import styled from 'styled-components'

export const ItemLabel = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  marginTop: theme.spacing.xxsmall,
}))
