import {
  BrowseAppsIcon,
  Button,
  Card,
  Flex,
  Flyover,
  Table,
} from '@pluralsh/design-system'
import {
  ColActivity,
  ColCluster,
  ColErrors,
  ColLinkout,
  ColPrUrl,
  ColService,
  ColStatus,
  ColTemplate,
} from './PreviewInstancesTableCols'

import { Row } from '@tanstack/react-table'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  PreviewEnvironmentInstance,
  useFlowPreviewEnvironmentInstancesQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'
import type { FlowOutletContext } from '../Flow'
import { PreviewTemplatesTable } from './PreviewTemplatesTable'
import { SpawnPreviewModal } from './SpawnPreviewModal'

export function FlowPreviews() {
  const navigate = useNavigate()
  const { flow } = useOutletContext<FlowOutletContext>()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  )
  const [showModal, setShowModal] = useState(false)
  const [showFlyover, setShowFlyover] = useState(false)
  const onFlyoverClose = () => {
    setShowFlyover(false)
    setSelectedTemplateId(null)
  }

  useSetPageHeaderContent(
    <Button
      secondary
      onClick={() => setShowModal(true)}
    >
      Spawn a PR preview
    </Button>
  )

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useFlowPreviewEnvironmentInstancesQuery,
        keyPath: ['flow', 'previewEnvironmentInstances'],
      },
      { id: flow?.id ?? '' }
    )

  const previews = useMemo(
    () => mapExistingNodes(data?.flow?.previewEnvironmentInstances),
    [data]
  )

  if (error) return <GqlError error={error} />

  return (
    <Card
      css={{ overflow: 'hidden' }}
      header={{
        size: 'large',
        content: (
          <Flex
            align="center"
            justify="space-between"
            width="100%"
          >
            <span>preview instances</span>
            <Button
              small
              floating
              startIcon={<BrowseAppsIcon />}
              onClick={() => setShowFlyover(true)}
            >
              View all templates
            </Button>
          </Flex>
        ),
      }}
    >
      <Table
        flush
        fullHeightWrap
        virtualizeRows
        fillLevel={1}
        loading={!data && loading}
        data={previews}
        columns={cols}
        reactTableOptions={{ meta: { setSelectedTemplateId } }}
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        onVirtualSliceChange={setVirtualSlice}
        emptyStateProps={{ message: 'No preview instances found.' }}
        onRowClick={(_, row: Row<PreviewEnvironmentInstance>) => {
          navigate(
            getServiceDetailsPath({
              clusterId: row.original.service?.cluster?.id ?? '',
              serviceId: row.original.service?.id ?? '',
            })
          )
        }}
      />
      <Flyover
        header="Templates"
        open={showFlyover || !!selectedTemplateId}
        onClose={onFlyoverClose}
      >
        <PreviewTemplatesTable
          flowId={flow?.id ?? ''}
          selectedTemplateId={selectedTemplateId}
        />
      </Flyover>
      <SpawnPreviewModal
        open={showModal}
        onClose={() => setShowModal(false)}
        flowId={flow?.id ?? ''}
      />
    </Card>
  )
}

const cols = [
  ColPrUrl,
  ColService,
  ColCluster,
  ColActivity,
  ColStatus,
  ColErrors,
  ColTemplate,
  ColLinkout,
]
