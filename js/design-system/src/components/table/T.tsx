import styled from 'styled-components'

export const T = styled.table<{ $gridTemplateColumns: string }>(
  ({ theme, $gridTemplateColumns }) => ({
    gridTemplateColumns: $gridTemplateColumns,
    borderSpacing: 0,
    display: 'grid',
    borderCollapse: 'collapse',
    minWidth: '100%',
    width: '100%',
    ...theme.partials.text.body2LooseLineHeight,
  })
)
