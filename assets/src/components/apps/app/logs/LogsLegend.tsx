import styled from 'styled-components'

import { Prop, PropsContainer } from '@pluralsh/design-system'

import { useBorderColor } from './LogLine'
import { Level } from './misc'

export const LegendColor = styled.div(({ theme, color = '#ffffff' }) => ({
  backgroundColor: color,
  borderRadius: theme.borderRadiuses.normal,
  height: 12,
  width: 12,
}))

export const LegendWrap = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.xsmall,
}))

export default function LogsLegend() {
  const borderColor = useBorderColor()

  return (
    <PropsContainer>
      <Prop title="Log legend">
        <LegendWrap>
          <LegendColor color={borderColor(Level.OTHER)} />
          Unknown
        </LegendWrap>
        <LegendWrap>
          <LegendColor color={borderColor(Level.INFO)} />
          Info
        </LegendWrap>
        <LegendWrap>
          <LegendColor color={borderColor(Level.WARN)} />
          Warning
        </LegendWrap>
        <LegendWrap>
          <LegendColor color={borderColor(Level.ERROR)} />
          Error
        </LegendWrap>
      </Prop>
    </PropsContainer>
  )
}
