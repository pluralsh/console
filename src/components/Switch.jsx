import { normalizeColor } from 'grommet/utils'
import styled from 'styled-components'

const Wrapper = styled.div`
  width: 36px;
`
const Inner = styled.div`
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
  transition: all 150ms linear;
`

function Switch({ checked, onChange, ...props }) {
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
export default Switch
