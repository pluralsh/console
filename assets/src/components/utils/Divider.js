import React, { useContext } from 'react'
import { Text, ThemeContext } from 'grommet'
import { normalizeColor } from 'grommet/utils'
import styled from 'styled-components'

const StyledDivider = styled.div`
${props => (
    `
    display: flex;
    flex-basis: 100%;
    align-items: ${props.align || 'center'};
    max-height: 30px;
    color: ${normalizeColor(props.color || 'dark-1', props.theme)};
    margin: ${props.margin || '8px'} 0px;
    &::before, &::after {
      content: "";
      flex-grow: 1;
      background: ${normalizeColor(props.color || 'light-6', props.theme)};
      height: 1px;
      font-size: 0px;
      line-height: 0px;
      margin: 0px ${props.textMargin || '8px'};
    }
  `
  )}
`

export default function Divider({ color, text }) {
  const theme = useContext(ThemeContext)

  return (
    <StyledDivider
      theme={theme}
      color={color}
    >
      {text && (
        <Text
          weight={500}
          size="small"
        >{text}
        </Text>
      )}
    </StyledDivider>
  )
}
