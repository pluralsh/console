import styled from 'styled-components'

export const TruncateStart = styled.div((_) => ({
  direction: 'rtl',
  textAlign: 'left',
  span: {
    direction: 'ltr',
    unicodeBidi: 'bidi-override',
  },
}))
