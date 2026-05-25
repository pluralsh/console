import {
  Button,
  Card,
  EmptyState,
  Flex,
  IconFrame,
  PencilIcon,
  Table,
  TrashCanIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2P } from 'components/utils/typography/Text'
import {
  useChatProviderConnectionsQuery,
  useWorkbenchChatbotsQuery,
  useWorkbenchQuery,
  WorkbenchChatbotFragment,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchChatbotCreateAbsPath,
  getWorkbenchChatbotCreateConnectionAbsPath,
  getWorkbenchChatbotEditAbsPath,
  WORKBENCH_PARAM_ID,
} from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import { ChatbotDeleteModal } from './ChatbotDeleteModal'
import {
  chatProviderConnectionIcon,
  chatProviderConnectionLabel,
} from './utils'

export function Chatbots() {
  const navigate = useNavigate()
  const theme = useTheme()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const [deletingChatbot, setDeletingChatbot] =
    useState<Nullable<WorkbenchChatbotFragment>>(null)

  const {
    data: workbenchData,
    loading: workbenchLoading,
    error: workbenchError,
  } = useWorkbenchQuery({
    variables: { id: workbenchId },
    fetchPolicy: 'cache-and-network',
    skip: !workbenchId,
  })
  const workbench = workbenchData?.workbench

  const { data: connectionsData } = useChatProviderConnectionsQuery({
    variables: { first: 1 },
    fetchPolicy: 'cache-and-network',
  })

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useWorkbenchChatbotsQuery,
        keyPath: ['workbench', 'chatbots'],
      },
      { id: workbenchId }
    )

  const chatbots = useMemo(
    () => mapExistingNodes(data?.workbench?.chatbots),
    [data]
  )
  const hasExistingChatbots = !isEmpty(
    mapExistingNodes(connectionsData?.chatProviderConnections)
  )

  useSetBreadcrumbs(
    useMemo(
      () => [...getWorkbenchBreadcrumbs(workbench), { label: 'chatbots' }],
      [workbench]
    )
  )

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: (chatbot) =>
          navigate(
            getWorkbenchChatbotEditAbsPath({
              workbenchId,
              chatbotId: chatbot.id,
            })
          ),
        onDelete: (chatbot) => setDeletingChatbot(chatbot),
      }),
    [navigate, workbenchId]
  )

  if (workbenchError) return <GqlError error={workbenchError} />

  if (error) return <GqlError error={error} />

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
      overflow="auto"
      padding="large"
    >
      <Flex
        direction="column"
        gap="large"
        width="100%"
        css={{ maxWidth: 750, marginInline: 'auto' }}
      >
        <StackedText
          loading={!workbenchData && workbenchLoading}
          first={workbench?.name}
          firstPartialType="subtitle2"
          firstColor="text"
          second={workbench?.description}
          secondPartialType="body2"
          secondColor="text-xlight"
          gap="xxsmall"
        />
        {!!data && isEmpty(chatbots) ? (
          <Card>
            <EmptyState
              message="No chatbots created yet"
              description={
                hasExistingChatbots
                  ? 'No chatbots connected. Select an existing connected chatbot or create a new one.'
                  : 'No chatbots connected. Setup a new chatbot trigger for your workbench.'
              }
              css={{ margin: '0 auto', width: 500 }}
            >
              <Flex gap="small">
                <Button
                  small
                  secondary={hasExistingChatbots}
                  onClick={() =>
                    navigate(
                      getWorkbenchChatbotCreateConnectionAbsPath(workbenchId)
                    )
                  }
                >
                  Add new chatbot
                </Button>
                {hasExistingChatbots && (
                  <Button
                    small
                    onClick={() =>
                      navigate(getWorkbenchChatbotCreateAbsPath(workbenchId))
                    }
                  >
                    Select existing chatbot
                  </Button>
                )}
              </Flex>
            </EmptyState>
          </Card>
        ) : (
          <StretchedFlex
            direction="column"
            align="stretch"
            gap="large"
          >
            <StretchedFlex
              css={{
                paddingLeft: theme.spacing.xxxsmall,
                paddingRight: theme.spacing.xxxsmall,
              }}
            >
              <Body2P
                $color="text-light"
                css={{ margin: 0 }}
              >
                Add chatbots to trigger this workbench from chat.
              </Body2P>
              <Button
                small
                onClick={() =>
                  navigate(
                    getWorkbenchChatbotCreateConnectionAbsPath(workbenchId)
                  )
                }
              >
                Add new chatbot
              </Button>
            </StretchedFlex>
            <Table
              hideHeader
              loose
              fullHeightWrap
              virtualizeRows
              data={chatbots}
              columns={columns}
              loading={!data && loading}
              hasNextPage={pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={loading}
              onVirtualSliceChange={setVirtualSlice}
            />
          </StretchedFlex>
        )}
      </Flex>
      <ChatbotDeleteModal
        open={!!deletingChatbot}
        chatbot={deletingChatbot}
        onClose={() => setDeletingChatbot(null)}
      />
    </Flex>
  )
}

const columnHelper = createColumnHelper<WorkbenchChatbotFragment>()
function getColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (chatbot: WorkbenchChatbotFragment) => void
  onDelete: (chatbot: WorkbenchChatbotFragment) => void
}) {
  return [
    columnHelper.accessor((chatbot) => chatbot, {
      id: 'icons',
      meta: { gridTemplate: '46px' },
      cell: ({ getValue }) => {
        const chatbot = getValue()

        return (
          <IconFrame
            type="secondary"
            css={{ borderRadius: '50%' }}
            icon={chatProviderConnectionIcon(chatbot.chatConnection?.type)}
            tooltip={chatProviderConnectionLabel(chatbot.chatConnection?.type)}
          />
        )
      },
    }),
    columnHelper.accessor((chatbot) => chatbot, {
      id: 'details',
      meta: { truncate: true, gridTemplate: 'minmax(0, 1fr)' },
      cell: ({ getValue }) => {
        const chatbot = getValue()

        return (
          <StackedText
            truncate
            first={chatbot.chatConnection?.name ?? 'Chatbot'}
            second={`#${chatbot.channel}`}
          />
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      meta: { gridTemplate: '100px' },
      cell: ({ row }) => (
        <Flex
          align="center"
          justify="flex-end"
          gap="xsmall"
        >
          <IconFrame
            clickable
            tooltip="Edit chatbot"
            icon={<PencilIcon />}
            onClick={() => onEdit(row.original)}
          />
          <IconFrame
            clickable
            tooltip="Delete chatbot"
            icon={<TrashCanIcon color="icon-danger" />}
            onClick={() => onDelete(row.original)}
          />
        </Flex>
      ),
    }),
  ]
}
