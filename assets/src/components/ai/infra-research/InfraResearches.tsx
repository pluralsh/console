import {
  Button,
  CaretRightIcon,
  Chip,
  ChipProps,
  Flex,
  FormField,
  IconFrame,
  Modal,
  PlusIcon,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { DateTimeCol } from 'components/utils/table/DateTimeCol'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Subtitle1H1 } from 'components/utils/typography/Text'
import {
  InfraResearchFragment,
  InfraResearchStatus,
  useCreateInfraResearchMutation,
  useInfraResearchesQuery,
} from 'generated/graphql'
import { capitalize } from 'lodash'
import { FormEvent, useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AI_INFRA_RESEARCH_REL_PATH } from 'routes/aiRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'
import { PromptInputSC } from '../agent-runs/CreateAgentRun'
import { getAIBreadcrumbs } from '../AI'

export const getInfraResearchesBreadcrumbs = () =>
  getAIBreadcrumbs(AI_INFRA_RESEARCH_REL_PATH)

export function InfraResearches() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useInfraResearchesQuery,
      keyPath: ['infraResearches'],
    })

  const infraResearches = useMemo(
    () => mapExistingNodes(data?.infraResearches),
    [data?.infraResearches]
  )

  useSetBreadcrumbs(useMemo(() => getInfraResearchesBreadcrumbs(), []))

  return (
    <Flex
      direction="column"
      gap="xsmall"
      overflow="hidden"
    >
      <StretchedFlex>
        <Subtitle1H1> Infra research</Subtitle1H1>
        <Button
          startIcon={<PlusIcon />}
          alignSelf="flex-end"
          onClick={() => setShowCreateModal(true)}
        >
          Start a run
        </Button>
      </StretchedFlex>
      {error ? (
        <GqlError error={error} />
      ) : (
        <Table
          fullHeightWrap
          virtualizeRows
          loading={!data && loading}
          data={infraResearches}
          columns={columns}
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={loading}
          onVirtualSliceChange={setVirtualSlice}
          emptyStateProps={{ message: 'No infra research runs found.' }}
          getRowLink={({ original }) =>
            `${AI_INFRA_RESEARCH_REL_PATH}/${(original as InfraResearchFragment).id}`
          }
        />
      )}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      >
        <CreateInfraResearchForm onComplete={() => setShowCreateModal(false)} />
      </Modal>
    </Flex>
  )
}

function CreateInfraResearchForm({ onComplete }: { onComplete: () => void }) {
  const [prompt, setPrompt] = useState('')

  const [mutation, { loading, error }] = useCreateInfraResearchMutation({
    onCompleted: onComplete,
    refetchQueries: ['InfraResearches'],
    awaitRefetchQueries: true,
  })

  const allowSubmit = !!prompt

  const handleSubmit = useCallback(
    (e?: FormEvent<HTMLFormElement>) => {
      e?.preventDefault()
      if (allowSubmit) mutation({ variables: { attributes: { prompt } } })
    },
    [allowSubmit, mutation, prompt]
  )

  return (
    <form onSubmit={handleSubmit}>
      <Flex
        direction="column"
        gap="small"
      >
        <FormField
          label="Prompt"
          name="prompt"
        >
          <PromptInputSC
            placeholder="Enter a prompt"
            initialValue={prompt}
            setValue={setPrompt}
            onEnter={handleSubmit}
          />
        </FormField>
        {error && <GqlError error={error} />}
        <Flex
          justify="flex-end"
          gap="small"
        >
          <Button
            type="button"
            secondary
            disabled={loading}
            onClick={() => onComplete()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!allowSubmit}
          >
            Create
          </Button>
        </Flex>
      </Flex>
    </form>
  )
}

const columnHelper = createColumnHelper<InfraResearchFragment>()

const columns = [
  columnHelper.accessor('prompt', {
    id: 'prompt',
    header: 'Prompt',
    meta: { gridTemplate: '1fr', truncate: true },
  }),
  columnHelper.accessor('status', {
    id: 'status',
    header: 'Status',
    cell: ({ getValue }) => <InfraResearchStatusChip status={getValue()} />,
  }),
  columnHelper.accessor('insertedAt', {
    id: 'createdAt',
    header: 'Created At',
    cell: ({ getValue }) => <DateTimeCol date={getValue()} />,
  }),
  columnHelper.accessor(({ id }) => id, {
    id: 'actions',
    header: '',
    cell: ({ getValue }) => {
      return (
        <IconFrame
          clickable
          as={Link}
          to={`${AI_INFRA_RESEARCH_REL_PATH}/${getValue()}`}
          tooltip="View details"
          icon={<CaretRightIcon />}
        />
      )
    },
  }),
]

export function InfraResearchStatusChip({
  status,
  ...props
}: {
  status: Nullable<InfraResearchStatus>
} & ChipProps) {
  if (!status) return null
  return (
    <Chip
      {...props}
      severity={status === InfraResearchStatus.Completed ? 'success' : 'info'}
    >
      {capitalize(status)}
    </Chip>
  )
}
