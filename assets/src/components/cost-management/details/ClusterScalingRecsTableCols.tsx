import { createColumnHelper } from '@tanstack/react-table'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P } from 'components/utils/typography/Text'
import { ClusterScalingRecommendationFragment } from 'generated/graphql'
import styled from 'styled-components'

const columnHelper = createColumnHelper<ClusterScalingRecommendationFragment>()

export const ColName = columnHelper.accessor((rec) => rec, {
  id: 'Name',
  header: 'Namespace > Name',
  meta: { gridTemplate: '1fr' },
  cell: function Cell({ getValue }) {
    const rec = getValue()

    return (
      <StackedText
        css={{ whiteSpace: 'pre-wrap' }}
        first={`${rec.namespace ?? '--'}  >  ${rec.name ?? '--'}`}
        second={rec.container}
      />
    )
  },
})

export const ColCpuChange = columnHelper.accessor((rec) => rec, {
  id: 'cpuChange',
  header: 'CPU change',
  cell: function Cell({ getValue }) {
    const rec = getValue()

    return (
      <Body2P css={{ whiteSpace: 'pre-wrap' }}>
        {`${rec.cpuRequest ?? '--'}  →  `}
        <BoldTextSC>{`${rec.cpuRecommendation ?? '--'}`}</BoldTextSC>
      </Body2P>
    )
  },
})

export const ColMemoryChange = columnHelper.accessor((rec) => rec, {
  id: 'memoryChange',
  header: 'Memory change',
  cell: function Cell({ getValue }) {
    const rec = getValue()

    return (
      <Body2P css={{ whiteSpace: 'pre-wrap' }}>
        {`${rec.memoryRequest ? `${Math.round(rec.memoryRequest / (1024 * 1024))}mb` : '--'}  →  `}
        <BoldTextSC>{`${rec.memoryRecommendation ?? '--'}`}</BoldTextSC>
      </Body2P>
    )
  },
})

const BoldTextSC = styled.strong(({ theme }) => ({
  color: theme.colors.text,
}))
