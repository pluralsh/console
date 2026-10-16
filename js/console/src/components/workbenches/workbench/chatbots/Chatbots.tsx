import {
  ArrowTopRightIcon,
  Button,
  Flex,
  IconFrame,
  PencilIcon,
  Table,
  TrashCanIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { WorkbenchEmptyState } from 'components/workbenches/common/WorkbenchEmptyState'
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
  getWorkbenchChatbotEditAbsPath,
  WORKBENCH_PARAM_ID,
} from 'routes/workbenchesRoutesConsts'
import {
  CHATBOTS_SETTINGS_ABS_PATH,
  CHATBOTS_SETTINGS_CREATE_ABS_PATH,
} from 'routes/settingsRoutesConst'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import { ChatbotDeleteModal } from './ChatbotDeleteModal'
import {
  chatProviderConnectionIcon,
  chatProviderConnectionLabel,
  formatChatbotChannelLabel,
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
  const hasExistingConnections = !isEmpty(
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
  const navigateToManageChatbots = () => navigate(CHATBOTS_SETTINGS_ABS_PATH)
  const navigateToCreateChatbotConnection = () =>
    navigate(CHATBOTS_SETTINGS_CREATE_ABS_PATH, {
      state: { returnPath: getWorkbenchChatbotCreateAbsPath(workbenchId) },
    })

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
          <WorkbenchEmptyState
            inset={false}
            message="No chatbots yet"
            description={
              hasExistingConnections
                ? 'Connect a chatbot so people can run this workbench from chat. Select an existing chatbot connection to get started.'
                : 'There are no chatbot connections yet. Create one in chatbot settings, then add it to this workbench.'
            }
          >
            <Flex gap="small">
              <Button
                small
                secondary={hasExistingConnections}
                onClick={() =>
                  hasExistingConnections
                    ? navigateToManageChatbots()
                    : navigateToCreateChatbotConnection()
                }
                endIcon={<ArrowTopRightIcon />}
              >
                Manage chatbots
              </Button>
              {hasExistingConnections && (
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
          </WorkbenchEmptyState>
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
                Add chatbots to trigger this workbench.
              </Body2P>
              <Flex gap="small">
                <Button
                  small
                  secondary
                  onClick={navigateToManageChatbots}
                  endIcon={<ArrowTopRightIcon />}
                >
                  Manage chatbots
                </Button>
                <Button
                  small
                  onClick={() =>
                    navigate(getWorkbenchChatbotCreateAbsPath(workbenchId))
                  }
                >
                  Add chatbot
                </Button>
              </Flex>
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
            second={formatChatbotChannelLabel({
              type: chatbot.chatConnection?.type,
              channel: chatbot.channel,
            })}
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
