import Prop from 'components/utils/Prop'
import { PropsContainer } from 'components/utils/PropsContainer'
import styled from 'styled-components'

import { borderColor } from './LogLine'
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
  return (
    <PropsContainer>
      <Prop title="Log legend">
        <LegendWrap><LegendColor color={borderColor(Level.INFO)} /> Info</LegendWrap>
        <LegendWrap><LegendColor color={borderColor(Level.WARN)} /> Warning</LegendWrap>
        <LegendWrap><LegendColor color={borderColor(Level.ERROR)} /> Error</LegendWrap>
        <LegendWrap><LegendColor color={borderColor(Level.OTHER)} /> No status</LegendWrap>
      </Prop>
    </PropsContainer>
  )
}
