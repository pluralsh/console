import styled from 'styled-components'

// Outer stroke is its own rounded edge so the color follows the corner
// instead of mitering into the card's 1px border.
export const StatusAccentFrameSC = styled.div<{ $accent: string }>(
  ({ theme, $accent }) => ({
    display: 'flex',
    width: '100%',
    minWidth: 0,
    borderLeft: `${theme.borderRadiuses.medium}px solid ${$accent}`,
    borderRadius: theme.borderRadiuses.medium,
    overflow: 'hidden',
  })
)
