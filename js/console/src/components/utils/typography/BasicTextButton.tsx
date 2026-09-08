import styled from 'styled-components'

export const BasicTextButton = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.buttonMedium,
  color: theme.colors['text-light'],
  height: 'fit-content',
  cursor: 'pointer',
  '&:hover': { textDecoration: 'underline' },
}))
