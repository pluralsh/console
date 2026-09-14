import { Div, Flex, type FlexProps } from 'honorable'
import styled from 'styled-components'

import { type SemanticColorKey } from '../theme/colors'

type DividerProps = FlexProps & {
  text?: string
  color?: string
  backgroundColor?: string
}

function Divider({
  text,
  color = 'text-light',
  backgroundColor = 'text-light',
  ...props
}: DividerProps) {
  return (
    <Flex
      align="center"
      {...props}
    >
      <Div
        flexGrow={1}
        height={1}
        backgroundColor={backgroundColor}
      />
      {!!text && (
        <>
          <LabelSC $color={color}>{text}</LabelSC>
          <Div
            flexGrow={1}
            height={1}
            backgroundColor={backgroundColor}
          />
        </>
      )}
    </Flex>
  )
}

const LabelSC = styled.p<{ $color: string }>(({ theme, $color }) => ({
  margin: 0,
  paddingLeft: theme.spacing.xsmall,
  paddingRight: theme.spacing.xsmall,
  flexShrink: 0,
  ...theme.partials.text.body2,
  color: theme.colors[$color as SemanticColorKey] ?? $color,
}))

export default Divider
