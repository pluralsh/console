import { normalizeColor } from 'grommet/utils'
import styled from 'styled-components'
import { Box } from 'grommet'

const containerStyling = styled.div`
  border-color: ${(props) => normalizeColor('light-4', props.theme)};
  border-width: 1px;
  border-style: solid;
  border-radius: ${(props) =>
    props.theme.global.edgeSize[props.round || 'medium']} !important;
  ${(props) => props.width && `width: ${props.width} !important;`}

  ${(props) =>
    !props.noHover &&
    `&:hover {
      border-color: ${normalizeColor('brand', props.theme)};
      box-shadow: ${
        props.theme.global.elevation[props.theme.dark ? 'dark' : 'light'].medium
      };
    }`}
  &:hover .modifier {
    display: flex !important;
  }
`

export function Container({ children, pad, ...props }) {
  return (
    <Box
      as={containerStyling}
      pad={pad || 'medium'}
      round="xsmall"
      focusIndicator={false}
      {...props}
    >
      {children}
    </Box>
  )
}
