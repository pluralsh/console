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
import { useTheme } from 'styled-components'
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

import { useProjectId } from '../../contexts/ProjectsContext'

import { Pipeline } from './PipelineGraph'
import { PIPELINES_CRUMBS } from './Pipelines'
import { PipelineContexts } from './PipelineContexts'

const POLL_INTERVAL = 10 * 1000

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
  split: 'Split',
  graph: 'Graph',
  contexts: 'Contexts',
} as const

export function PipelineTabs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabStateRef = useRef<any>(null)

  const view = searchParams.get('view')
  const tabKey = view && tabs[view] ? (view as keyof typeof tabs) : 'graph'

  return (
    <TabList
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
  const projectId = useProjectId()
  const [inputValue, setInputValue] = useState('')
  const throttledInputValue = useThrottle(inputValue, 100)
  const [isOpen, setIsOpen] = useState(false)
  const { data } = usePipelinesQuery({
    variables: { first: 20, q: throttledInputValue, projectId },
    fetchPolicy: 'cache-and-network',
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

  const contentGraph = pipeline && (
    <Pipeline
      pipeline={pipeline}
      key={pipeline.id}
    />
  )

  const contentContexts = <PipelineContexts pipeline={pipeline} />

  let content = contentGraph

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
  } else if (view === 'split') {
    content = (
      <SplitPane
        id="pipeline-details"
        pane1={contentGraph}
        pane2={contentContexts}
      />
    )
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
