import styled from 'styled-components'

import { Prop, PropsContainer } from '@pluralsh/design-system'

import { useBorderColor, Level } from './LogLine'
import { ComponentPropsWithRef } from 'react-spring'

export const LegendColor = styled.div(({ theme, color = '#ffffff' }) => ({
  backgroundColor: color,
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
  const borderColor = useBorderColor()

  return (
    <PropsContainer {...props}>
      <FlexPropSC title="Log legend">
        <LegendWrap>
          <LegendColor color={borderColor(Level.UNKNOWN)} />
          Unknown
        </LegendWrap>
        <LegendWrap>
          <LegendColor color={borderColor(Level.INFO)} />
          Info
        </LegendWrap>
        <LegendWrap>
          <LegendColor color={borderColor(Level.SUCCESS)} />
          Success
        </LegendWrap>
        <LegendWrap>
          <LegendColor color={borderColor(Level.WARN)} />
          Warning
        </LegendWrap>
        <LegendWrap>
          <LegendColor color={borderColor(Level.ERROR)} />
          Error
        </LegendWrap>
      </FlexPropSC>
    </PropsContainer>
  )
}

const FlexPropSC = styled(Prop)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
}))
