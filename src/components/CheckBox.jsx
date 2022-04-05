import { CheckBox as GrommetCheckBox } from 'grommet'
import { normalizeColor } from 'grommet/utils'
import styled from 'styled-components'

const CheckBox = styled(GrommetCheckBox)`
  ${({ checked, theme }) => checked && `
    & ~ div {
      background-color: ${normalizeColor(theme.global.colors.brand, theme)};
      border-color: ${normalizeColor(theme.global.colors.brand, theme)};
    }

    &:hover ~ div {
      background-color: transparent;
    }
  `}
`

export default CheckBox
