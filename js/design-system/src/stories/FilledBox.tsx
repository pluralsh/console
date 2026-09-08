import styled from 'styled-components'

export const FilledBox = styled.div<{ $bgColor?: string }>(
  ({ theme, $bgColor }) => ({
    width: '64px',
    height: '64px',
    backgroundColor: $bgColor || theme.colors['fill-one'],
  })
)
