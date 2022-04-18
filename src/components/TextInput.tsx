import { PropsWithRef } from 'react'
import { TextInput as GrommetTextInput, TextInputProps as GrommetTextInputProps } from 'grommet'
import { normalizeColor } from 'grommet/utils'
import styled from 'styled-components'
import PropTypes from 'prop-types'

type TextInputProps = PropsWithRef<GrommetTextInputProps> & {
  valid?: boolean
  error?: boolean
}

const propTypes = {
  valid: PropTypes.bool,
  error: PropTypes.bool,
}

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

function TextInput({ valid = false, error = false, ...props }: TextInputProps) {
  if (valid) return <ValidTextInput {...props} />
  if (error) return <ErrorTextInput {...props} />

  return <GrommetTextInput {...props} />
}

TextInput.propTypes = propTypes

export default TextInput
