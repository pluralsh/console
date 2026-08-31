import styled, { useTheme } from 'styled-components'

import { Flex } from '@pluralsh/design-system'

import { logLevelToColor } from './LogLine'

export function LogsLegend() {
  const theme = useTheme()

  return (
    <Flex gap="medium">
      {Object.entries(logLevelToColor).map(([level, color]) => (
        <Flex
          key={level}
          gap="xsmall"
          align="center"
        >
          <LegendColor color={color} />
          <div css={{ ...theme.partials.text.caption }}>{level}</div>
        </Flex>
      ))}
    </Flex>
  )
}

export const LegendColor = styled.div(({ theme, color = 'border' }) => ({
  backgroundColor: theme.colors[color],
  borderRadius: theme.borderRadiuses.medium,
  height: 10,
  width: 10,
}))
