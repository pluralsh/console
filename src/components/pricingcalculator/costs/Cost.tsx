import styled from 'styled-components'

import InfoOutlineIcon from '../../icons/InfoOutlineIcon'
import Tooltip from '../../Tooltip'

const CostWrap = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  flexGrow: 1,
  flexShrink: 1,
  gap: theme.spacing.xsmall,
  alignItems: 'center',

  '.value': {
    ...theme.partials.text.subtitle2,
    color: theme.colors.text,
    minWidth: theme.spacing.xxlarge,
    marginRight: theme.spacing.xxxsmall,
  },
}))

export type CostProps = {
  cost: number
  label: string
  tooltip?: string
}

export default function Cost({ cost, label, tooltip }: CostProps) {
  return (
    <CostWrap>
      <div className="value">${cost}</div>
      <div>{label}</div>
      {tooltip && (
        <Tooltip label={tooltip}>
          <InfoOutlineIcon cursor="help" />
        </Tooltip>
      )}
    </CostWrap>
  )
}
