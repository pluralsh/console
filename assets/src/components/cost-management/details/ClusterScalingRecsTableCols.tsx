import { Button, LinkoutIcon, PrOpenIcon, Toast } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P } from 'components/utils/typography/Text'
import {
  ClusterScalingRecommendationFragment,
  useApplyScalingRecommendationMutation,
} from 'generated/graphql'
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

export const ColScalingPr = columnHelper.accessor((rec) => rec, {
  id: 'scalingPr',
  header: 'Create PR',
  cell: function Cell({ getValue }) {
    const rec = getValue()
    const [mutation, { data, loading, error }] =
      useApplyScalingRecommendationMutation({ variables: { id: rec.id } })

    if (!rec.service) {
      return null
    }

    if (data?.applyScalingRecommendation?.id) {
    }

    return (
      <Body2P css={{ whiteSpace: 'pre-wrap' }}>
        {error && (
          <Toast
            severity="danger"
            position="top-right"
            margin="large"
            heading="PR Creation Failed"
          >
            {error.message}
          </Toast>
        )}
        {data?.applyScalingRecommendation?.id ? (
          <Button
            primary
            type="button"
            endIcon={<LinkoutIcon />}
            as="a"
            href={data?.applyScalingRecommendation?.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View PR
          </Button>
        ) : (
          <Button
            secondary
            startIcon={<PrOpenIcon />}
            onClick={mutation}
            loading={loading}
          >
            Create PR
          </Button>
        )}
      </Body2P>
    )
  },
})

const BoldTextSC = styled.strong(({ theme }) => ({
  color: theme.colors.text,
}))
