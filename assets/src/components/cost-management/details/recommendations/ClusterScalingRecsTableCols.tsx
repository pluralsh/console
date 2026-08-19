import { isNullish } from '@apollo/client/cache/inmemory/helpers'
import {
  ArrowTopRightIcon,
  Button,
  PrOpenIcon,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { useWorkbenchOptions } from 'components/ai/insights/SendInsightToWorkbench'
import { createColumnHelper } from '@tanstack/react-table'
import { DistroProviderIconFrame } from 'components/utils/ClusterDistro'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P } from 'components/utils/typography/Text'
import { filesize } from 'filesize'
import { ClusterScalingRecommendationFragment } from 'generated/graphql'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { CreateRecommendationPrModal } from './CreateRecommendationPrModal'
import { ScalingRecommendationCluster } from './scalingRecommendationWorkbenchPrompt'

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
        second={rec.type?.toLowerCase()}
      />
    )
  },
})

export const ColContainer = columnHelper.accessor((rec) => rec.container, {
  id: 'container',
  header: 'Container',
})

export const ColCpuChange = columnHelper.accessor((rec) => rec, {
  id: 'cpuChange',
  header: 'CPU change',
  meta: { gridTemplate: 'max-content' },
  cell: function Cell({ getValue }) {
    const rec = getValue()
    return (
      <Body2P css={{ whiteSpace: 'pre-wrap', alignSelf: 'flex-end' }}>
        {`${formatCpu(rec.cpuRequest)}  →  `}
        <BoldTextSC>{`${formatCpu(rec.cpuRecommendation)}`}</BoldTextSC>
      </Body2P>
    )
  },
})

export const ColMemoryChange = columnHelper.accessor((rec) => rec, {
  id: 'memoryChange',
  header: 'Memory change',
  meta: { gridTemplate: 'max-content' },
  cell: function Cell({ getValue }) {
    const rec = getValue()
    return (
      <Body2P css={{ whiteSpace: 'pre-wrap', alignSelf: 'flex-end' }}>
        {`${formatMemory(rec.memoryRequest)}  →  `}
        <BoldTextSC>{`${formatMemory(rec.memoryRecommendation)}`}</BoldTextSC>
      </Body2P>
    )
  },
})

export const ColService = columnHelper.accessor((rec) => rec.service, {
  id: 'service',
  header: 'Service',
  cell: function Cell({ getValue }) {
    const service = getValue()
    const theme = useTheme()
    const navigate = useNavigate()
    if (!service) return null
    return (
      <a
        onClick={() =>
          navigate(
            getServiceDetailsPath({
              clusterId: service.cluster?.id,
              serviceId: service.id,
            })
          )
        }
        css={{
          color: theme.colors['text-light'],
          cursor: 'pointer',
          display: 'flex',
          gap: theme.spacing.xsmall,
          alignSelf: 'flex-end',
          alignItems: 'center',
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        <DistroProviderIconFrame
          background="fill-two"
          type="secondary"
          distro={service.cluster?.distro}
          provider={service.cluster?.provider?.cloud}
        />
        {service.name}
        <ArrowTopRightIcon />
      </a>
    )
  },
})

export const getColScalingPr = (cluster: ScalingRecommendationCluster) =>
  columnHelper.accessor((rec) => rec, {
    id: 'scalingPr',
    header: '',
    meta: { gridTemplate: 'max-content' },
    cell: function Cell({ getValue }) {
      const recommendation = getValue()
      const [isOpen, setIsOpen] = useState(false)
      const { hasWorkbenches, loading: workbenchesLoading } =
        useWorkbenchOptions()
      const canCreatePr = !!recommendation.service

      if (workbenchesLoading || (!hasWorkbenches && !canCreatePr)) return null

      return (
        <>
          <Button
            small
            floating
            startIcon={hasWorkbenches ? <WorkbenchIcon /> : <PrOpenIcon />}
            onClick={() => setIsOpen(true)}
          >
            {hasWorkbenches ? 'Send to Workbench' : 'Create PR'}
          </Button>
          <CreateRecommendationPrModal
            open={isOpen}
            onClose={() => setIsOpen(false)}
            scalingRecId={recommendation.id}
            cluster={cluster}
            recommendation={recommendation}
            startWithWorkbench={hasWorkbenches}
          />
        </>
      )
    },
  })

export const formatCpu = (cpu: Nullable<number>) => {
  if (isNullish(cpu)) return '--'
  if (cpu > 1) return `${Number(cpu).toFixed(1)}`

  return `${ceil(cpu * 1000, 10)}m`
}

const ceil = (val: number, mult: number) => Math.ceil(val / mult) * mult

export const formatMemory = (memory: Nullable<number>) => {
  if (isNullish(memory)) return '--'
  return filesize(memory, {
    spacer: '',
    symbols: {
      KB: 'Ki',
      MB: 'Mi',
      GB: 'Gi',
      TB: 'Ti',
      PB: 'Pi',
    },
  })
}

export const BoldTextSC = styled.strong(({ theme }) => ({
  color: theme.colors.text,
}))
