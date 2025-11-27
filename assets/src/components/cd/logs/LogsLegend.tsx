import styled from 'styled-components'

import { Prop, PropsContainer } from '@pluralsh/design-system'

import { ComponentPropsWithRef } from 'react'
import { logLevelToColor } from './LogLine'

export const LegendColor = styled.div(({ theme, color = 'border' }) => ({
  backgroundColor: theme.colors[color],
  borderRadius: theme.borderRadiuses.medium,
  height: 12,
  width: 12,
}))

export const LegendWrap = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,
}))

export default function LogsLegend(
  props: ComponentPropsWithRef<typeof PropsContainer>
) {
  return (
    <PropsContainer {...props}>
      <FlexPropSC title="Log legend">
        {Object.entries(logLevelToColor).map(([level, color]) => (
          <LegendWrap key={level}>
            <LegendColor color={color} />
            {level}
          </LegendWrap>
        ))}
      </FlexPropSC>
    </PropsContainer>
  )
}

const FlexPropSC = styled(Prop)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
}))
