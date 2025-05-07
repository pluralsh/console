import {
  BrowseAppsIcon,
  Button,
  Card,
  Code,
  Flex,
  Flyover,
  Modal,
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

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useFlowPreviewEnvironmentInstancesQuery } from 'generated/graphql'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { mapExistingNodes } from 'utils/graphql'
import { PreviewTemplatesTable } from './PreviewTemplatesTable'

export function FlowPreviews() {
  const { flowId } = useParams()
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
      { id: flowId ?? '' }
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
      />
      <Flyover
        header="Templates"
        open={showFlyover || !!selectedTemplateId}
        onClose={onFlyoverClose}
      >
        <PreviewTemplatesTable
          flowId={flowId ?? ''}
          selectedTemplateId={selectedTemplateId}
        />
      </Flyover>
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        header="Spawn a PR preview"
      >
        <Flex
          gap="large"
          flexDirection="column"
        >
          <span>
            To spawn a PR preview environment for your PR, add the following
            annotations into the PR body:
          </span>
          <Code>
            {'Plural Flow: {flow - name}\nPlural Preview: {template-name}'}
          </Code>
          <Button
            secondary
            onClick={() => setShowModal(false)}
          >
            Close
          </Button>
        </Flex>
      </Modal>
    </Card>
  )
}

const cols = [
  ColPrUrl,
  ColService,
  ColCluster,
  ColActivity,
  ColStatus,
  ColTemplate,
  ColErrors,
  ColLinkout,
]
