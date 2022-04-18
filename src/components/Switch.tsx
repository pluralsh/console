import { FC, MouseEvent } from 'react'
import { Box, BoxExtendedProps } from 'grommet'
import { normalizeColor } from 'grommet/utils'
import styled from 'styled-components'
import PropTypes from 'prop-types'

type CheckedProps = {
  checked?: boolean
}

type SwitchProps = BoxExtendedProps & CheckedProps & {
  onChange?: (checked: boolean, event: MouseEvent) => void
}

const propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func,
}

const Wrapper = styled(Box)`
  width: 36px;
`

const Inner = styled<FC<BoxExtendedProps & CheckedProps>>(Box)`
  position: relative;
  display: flex;
  width: 36px;
  height: 20px;
  padding: 3px;
  border-radius: 10px;
  background-color: ${({ theme, checked }) => normalizeColor(checked ? theme.global.colors.brand : theme.global.colors['background-light'], theme)};
  transition: all 150ms linear;
  cursor: pointer;
  box-sizing: border-box;
`

const Handle = styled.div`
  position: relative;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: #fff;
  transition: all 150ms ease;
`

function Switch({ checked = false, onChange = () => {}, ...props }: SwitchProps) {
  return (
    <Wrapper {...props}>
      <Inner
        checked={checked}
        onClick={event => onChange(!checked, event)}
      >
        <Handle style={{ left: checked ? 15 : 0 }} />
      </Inner>
    </Wrapper>
  )
}

Switch.propTypes = propTypes

export default Switch
