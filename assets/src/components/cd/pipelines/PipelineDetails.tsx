import { ComponentProps, useEffect, useMemo, useRef, useState } from 'react'
import {
  ComboBox,
  EmptyState,
  ListBoxItem,
  PrOpenIcon,
  SubTab,
  TabList,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import { ReactFlowProvider } from 'reactflow'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import {
  PipelineFragment,
  usePipelineQuery,
  usePipelinesQuery,
} from 'generated/graphql'
import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { mapExistingNodes } from 'utils/graphql'

import { useThrottle } from 'components/hooks/useThrottle'

import { SplitPane } from 'components/utils/SplitPane'

import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'

import { Pipeline } from './PipelineGraph'
import { PIPELINES_CRUMBS } from './Pipelines'
import { PipelineContexts } from './PipelineContexts'

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

export const PipelineHeadingSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
  alignItems: 'center',
  justifyContent: 'space-between',
}))
function PipelineHeading({
  pipeline,
}: {
  pipeline: Nullable<PipelineFragment>
}) {
  return (
    <>
      <PipelineSelector pipeline={pipeline} />
      <PipelineTabs />
    </>
  )
}

const tabs = {
  '': 'Split',
  graph: 'Graph',
  contexts: 'Contexts',
} as const

export function PipelineTabs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabStateRef = useRef<any>(null)

  const view = searchParams.get('view')
  const tabKey = view && tabs[view] ? (view as keyof typeof tabs) : ''

  return (
    <TabList
      gap="xxsmall"
      stateRef={tabStateRef}
      stateProps={{
        orientation: 'horizontal',
        selectedKey: tabKey,
        onSelectionChange: (key) => {
          setSearchParams((params) => {
            if (!key) {
              params.delete('view')

              return params
            }
            params.set('view', key as string)

            return params
          })
        },
      }}
    >
      {Object.entries(tabs).map(([tabKey, tabLabel]) => (
        <SubTab
          key={tabKey}
          textValue={tabLabel}
        >
          {tabLabel}
        </SubTab>
      ))}
    </TabList>
  )
}

function PipelineSelector({
  pipeline,
}: {
  pipeline: Nullable<PipelineFragment>
}) {
  const theme = useTheme()
  const [inputValue, setInputValue] = useState('')
  const throttledInputValue = useThrottle(inputValue, 100)
  const [isOpen, setIsOpen] = useState(false)
  const { data } = usePipelinesQuery({
    variables: { first: 20, q: throttledInputValue },
  })
  const navigate = useNavigate()

  const pipelines = useMemo(
    () => mapExistingNodes(data?.pipelines),
    [data?.pipelines]
  )
  const onSelectionChange: ComponentProps<
    typeof ComboBox
  >['onSelectionChange'] = (key) => {
    if (key) {
      setInputValue('')
      navigate(`${PIPELINES_ABS_PATH}/${key}`)
    }
  }

  useEffect(() => {}, [])

  const onInputChange: ComponentProps<typeof ComboBox>['onInputChange'] = (
    value
  ) => {
    setInputValue(value)
  }

  return (
    <ComboBox
      aria-label="pipeline"
      isOpen={isOpen}
      inputValue={inputValue}
      selectedKey={pipeline?.id}
      onSelectionChange={onSelectionChange}
      onInputChange={onInputChange}
      onOpenChange={(isOpen, _trigger) => {
        setIsOpen(isOpen)
      }}
      titleContent={
        <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
          <PrOpenIcon />
          Pipeline
        </div>
      }
      inputProps={{
        placeholder: pipeline ? pipeline.name : 'Select pipeline',
      }}
    >
      {pipelines.map((pipeline) => (
        <ListBoxItem
          key={pipeline.id}
          label={pipeline.name}
        />
      ))}
    </ComboBox>
  )
}

function PipelineDetailsBase() {
  const theme = useTheme()
  const pipelineId = useParams().pipelineId!
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view')

  const { data, error } = usePipelineQuery({
    variables: { id: pipelineId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    notifyOnNetworkStatusChange: true,
  })

  const pipeline = data?.pipeline

  useSetBreadcrumbs(
    useMemo(
      () =>
        getPipelineBreadcrumbs({
          pipelineName: pipeline?.name,
          pipelineId,
        }),
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

  const contentGraph = (
    <PipelineEditAreaSC>
      {pipeline && (
        <Pipeline
          pipeline={pipeline}
          key={pipeline.id}
        />
      )}
    </PipelineEditAreaSC>
  )
  const contentContexts = <FullHeightTableWrap><PipelineContexts pipeline={pipeline} /></FullHeightTableWrap>

  let content = (
    <SplitPane
      id="pipeline-details"
      pane1={contentGraph}
      pane2={contentContexts}
    />
  )

  if (view === 'contexts') {
    content = (
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
        }}
      >
        {contentContexts}
      </div>
    )
  } else if (view === 'graph') {
    content = contentGraph
  }

  return (
    <ResponsivePageFullWidth
      scrollable={false}
      // heading={`Pipeline — ${pipeline?.name}`}
      headingContent={<PipelineHeading pipeline={pipeline} />}
    >
      {pipeline && (
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.medium,
            height: '100%',
          }}
        >
          {content}
        </div>
      )}
    </ResponsivePageFullWidth>
  )
}

export function getPipelineBreadcrumbs({
  pipelineName,
  pipelineId,
}: {
  pipelineName: Nullable<string>
  pipelineId: Nullable<string>
}) {
  return [
    ...PIPELINES_CRUMBS,
    ...(!pipelineName
      ? []
      : [
          {
            label: pipelineName,
            url: `${PIPELINES_ABS_PATH}/${pipelineId}`,
          },
        ]),
  ]
}

export default function PipelineDetails() {
  return (
    <ReactFlowProvider>
      <PipelineDetailsBase />
    </ReactFlowProvider>
  )
}
