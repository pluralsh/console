import { Logs } from 'components/cd/logs/Logs'
import { useParams } from 'react-router-dom'

import styled from 'styled-components'

export default function ServiceLogs() {
  const { serviceId } = useParams()

  return (
    <WrapperSC>
      <Logs
        serviceId={serviceId}
        showLegendTooltip={false}
      />
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  height: '100%',
  paddingBottom: theme.spacing.medium,
}))
