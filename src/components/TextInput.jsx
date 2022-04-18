import { TextInput as GrommetTextInput } from 'grommet'
import { normalizeColor } from 'grommet/utils'
import styled from 'styled-components'

const ValidTextInput = styled(GrommetTextInput)`
  border-color: ${({ theme }) => normalizeColor(theme.global.colors.brand, theme)};
  &:focus {
    border-color: ${({ theme }) => normalizeColor(theme.global.colors.brand, theme)};
  }
`

const ErrorTextInput = styled(GrommetTextInput)`
  border-color: ${({ theme }) => normalizeColor(theme.global.colors['status-critical'], theme)};
  &:focus {
    border-color: ${({ theme }) => normalizeColor(theme.global.colors['status-critical'], theme)};
  }
`

export default function TextInput({ valid = false, error = false, ...props }) {
  if (valid) return <ValidTextInput {...props} />
  if (error) return <ErrorTextInput {...props} />

  return <GrommetTextInput {...props} />
}
