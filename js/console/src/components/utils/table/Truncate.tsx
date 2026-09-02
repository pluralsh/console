import styled from 'styled-components'

export const TruncateEnd = styled.div((_) => ({
  width: '100%',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}))

export const TruncateStart = styled(TruncateEnd)((_) => ({
  direction: 'rtl',
  textAlign: 'left',
  span: {
    direction: 'ltr',
    unicodeBidi: 'bidi-override',
  },
}))
