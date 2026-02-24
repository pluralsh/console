import {
  ComboBox,
  EmptyState,
  Flex,
  ListBoxItem,
  PrOpenIcon,
  SubTab,
  TabList,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ReactFlowProvider } from '@xyflow/react'
import { ComponentProps, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import {
  PipelineFragment,
  usePipelineQuery,
  usePipelinesQuery,
} from 'generated/graphql'
import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import { mapExistingNodes } from 'utils/graphql'

import { useThrottle } from 'components/hooks/useThrottle'

import { SplitPane } from 'components/utils/SplitPane'

import { useProjectId } from '../../contexts/ProjectsContext'

import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { PipelineContexts } from './PipelineContexts'
import { Pipeline } from './PipelineGraph'
import { PIPELINES_CRUMBS } from './Pipelines'
import { POLL_INTERVAL } from '../ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'

function PipelineHeading({
  pipeline,
}: {
  pipeline: Nullable<PipelineFragment>
}) {
  return (
    <Flex justify="space-between">
      <PipelineSelector pipeline={pipeline} />
      <PipelineTabs />
    </Flex>
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
    fetchPolicy: 'no-cache',
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
  const { pipelineId } = useParams()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view')

  const { data, loading, error } = usePipelineQuery({
    variables: { id: pipelineId ?? '' },
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

  if (error)
    return (
      <GqlError
        margin="large"
        error={error}
      />
    )

  return (
    <Flex
      direction="column"
      height="100%"
      gap="medium"
      padding="large"
    >
      <PipelineHeading pipeline={pipeline} />
      {!pipeline ? (
        loading ? (
          <RectangleSkeleton
            $height={500}
            $width="100%"
          />
        ) : (
          <EmptyState message="Pipeline not found." />
        )
      ) : view === 'graph' ? (
        <Pipeline
          pipeline={pipeline}
          key={pipeline.id}
        />
      ) : view === 'contexts' ? (
        <PipelineContexts pipeline={pipeline} />
      ) : (
        <SplitPane
          id="pipeline-details"
          pane1={
            <Pipeline
              pipeline={pipeline}
              key={pipeline.id}
            />
          }
          pane2={<PipelineContexts pipeline={pipeline} />}
        />
      )}
    </Flex>
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
      : [{ label: pipelineName, url: `${PIPELINES_ABS_PATH}/${pipelineId}` }]),
  ]
}

export function PipelineDetails() {
  return (
    <ReactFlowProvider>
      <PipelineDetailsBase />
    </ReactFlowProvider>
  )
}
