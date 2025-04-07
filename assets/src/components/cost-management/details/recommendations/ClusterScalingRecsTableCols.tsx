import { isNullish } from '@apollo/client/cache/inmemory/helpers'
import {
  ArrowTopRightIcon,
  Button,
  LinkoutIcon,
  PrOpenIcon,
  Toast,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { DistroProviderIconFrame } from 'components/utils/ClusterDistro'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P } from 'components/utils/typography/Text'
import { filesize } from 'filesize'
import {
  ClusterScalingRecommendationFragment,
  useApplyScalingRecommendationMutation,
} from 'generated/graphql'
import { useNavigate } from 'react-router-dom'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import styled, { useTheme } from 'styled-components'

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

export const ColScalingPr = columnHelper.accessor((rec) => rec, {
  id: 'scalingPr',
  header: '',
  meta: { gridTemplate: 'max-content' },
  cell: function Cell({ getValue }) {
    const rec = getValue()
    const [mutation, { data, loading, error }] =
      useApplyScalingRecommendationMutation({ variables: { id: rec.id } })

    if (!rec.service) {
      return null
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
            small
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
            small
            floating
            endIcon={<PrOpenIcon />}
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

const formatCpu = (cpu: Nullable<number>) => {
  if (isNullish(cpu)) return '--'
  if (cpu > 1) return `${Number(cpu).toFixed(1)}`

  return `${ceil(cpu * 1000, 10)}m`
}

const ceil = (val: number, mult: number) => Math.ceil(val / mult) * mult

const formatMemory = (memory: Nullable<number>) => {
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

const BoldTextSC = styled.strong(({ theme }) => ({
  color: theme.colors.text,
}))
