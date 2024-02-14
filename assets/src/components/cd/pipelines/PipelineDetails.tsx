import { useMemo } from 'react'
import { EmptyState, useSetBreadcrumbs } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import { ReactFlowProvider } from 'reactflow'
import { useParams } from 'react-router-dom'

import { usePipelineQuery } from 'generated/graphql'
import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { Pipeline } from './Pipeline'
import { PIPELINES_CRUMBS } from './PipelinesList'

const POLL_INTERVAL = 10 * 1000

// const PipelineList = styled(VirtualList)(({ theme }) => ({
//   ...theme.partials.reset.list,
//   display: 'flex',
//   height: '100%',
//   width: 200,
//   flexShrink: 0,
// }))

// type ListMeta = {
//   selectedId: string
//   setSelectedId: (string) => void
// }

// const PipelineListItemSC = styled(Card)(({ theme, selected }) => ({
//   '&&': {
//     width: '100%',
//     padding: theme.spacing.medium,
//     display: 'flex',
//     alignItems: 'center',
//     gap: theme.spacing.medium,
//     borderColor: selected ? theme.colors['border-secondary'] : undefined,
//   },
// }))

// const PipelineListItem: VirtualListRenderer<Edge<PipelineFragment>, ListMeta> =
//   // eslint-disable-next-line func-names
//   function ({ row, meta }) {
//     const theme = useTheme()
//     const { node } = row

//     if (!node) {
//       return null
//     }
//     const isSelected = node.id === meta.selectedId

//     return (
//       <PipelineListItemSC
//         clickable
//         selected={isSelected}
//         onClick={(e) => {
//           e.preventDefault()
//           meta?.setSelectedId?.(node.id)
//         }}
//       >
//         <AppIcon
//           type="secondary"
//           size="xxsmall"
//           icon={
//             <PipelineIcon
//               color={
//                 isSelected
//                   ? theme.colors['icon-info']
//                   : theme.colors['icon-light']
//               }
//             />
//           }
//         />
//         <div>{row.node?.name}</div>
//       </PipelineListItemSC>
//     )
//   }

export const PipelineEditAreaSC = styled.div(({ theme }) => ({
  border: theme.borders.default,
  width: '100%',
  height: '100%',
  borderRadius: theme.borderRadiuses.large,
  position: 'relative',
  overflow: 'hidden',
}))

function PipelineDetailsBase() {
  const theme = useTheme()
  const pipelineId = useParams().pipelineId!

  const { data, error } = usePipelineQuery({
    variables: { id: pipelineId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    notifyOnNetworkStatusChange: true,
  })

  const pipeline = data?.pipeline

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...PIPELINES_CRUMBS,
        ...(!pipeline
          ? []
          : [
              {
                label: pipeline?.name,
                url: `${PIPELINES_ABS_PATH}/${pipelineId}`,
              },
            ]),
      ],
      [pipeline, pipelineId]
    )
  )

  const emptyState = (
    <EmptyState message="Looks like you don't have any pipelines yet." />
  )

  if (error) {
    return emptyState
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <ResponsivePageFullWidth
      scrollable={false}
      heading={`Pipeline — ${pipeline?.name}`}
    >
      {pipeline && (
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.medium,
            height: '100%',
          }}
        >
          <PipelineEditAreaSC>
            {pipeline && (
              <Pipeline
                pipeline={pipeline}
                key={pipeline.id}
              />
            )}
          </PipelineEditAreaSC>
        </div>
      )}
    </ResponsivePageFullWidth>
  )
}

export default function PipelineDetails() {
  return (
    <ReactFlowProvider>
      <PipelineDetailsBase />
    </ReactFlowProvider>
  )
}
