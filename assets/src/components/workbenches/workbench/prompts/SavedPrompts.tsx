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
  useWorkbenchPromptsQuery,
  useWorkbenchQuery,
  WorkbenchPromptFragment,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchSavedPromptCreateAbsPath,
  getWorkbenchSavedPromptEditAbsPath,
  WORKBENCH_PARAM_ID,
} from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { getWorkbenchBreadcrumbs } from '../Workbench'
import { SavedPromptDeleteModal } from './SavedPromptDeleteModal'

export function SavedPrompts() {
  const navigate = useNavigate()
  const theme = useTheme()
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const [deletingPrompt, setDeletingPrompt] =
    useState<Nullable<WorkbenchPromptFragment>>(null)

  const {
    data: workbenchData,
    loading: workbenchLoading,
    error: workbenchError,
  } = useWorkbenchQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
  })
  const workbench = workbenchData?.workbench

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: useWorkbenchPromptsQuery,
        keyPath: ['workbench', 'prompts'],
      },
      { id: workbenchId }
    )

  const prompts = useMemo(
    () => mapExistingNodes(data?.workbench?.prompts),
    [data]
  )

  useSetBreadcrumbs(
    useMemo(
      () => [...getWorkbenchBreadcrumbs(workbench), { label: 'saved prompts' }],
      [workbench]
    )
  )

  const columns = useMemo(
    () =>
      getColumns({
        onEdit: (savedPrompt) =>
          navigate(
            getWorkbenchSavedPromptEditAbsPath({
              workbenchId,
              savedPromptId: savedPrompt.id,
            })
          ),
        onDelete: (savedPrompt) => setDeletingPrompt(savedPrompt),
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
      <Flex
        direction="column"
        width="100%"
        css={{ maxWidth: 750 }}
      >
        {!!data && isEmpty(prompts) ? (
          <Card>
            <EmptyState
              message="No saved prompts yet"
              description="Create reusable prompts for this workbench."
              css={{ margin: '0 auto', width: 500 }}
            >
              <Button
                small
                onClick={() => {
                  navigate(getWorkbenchSavedPromptCreateAbsPath(workbenchId))
                }}
              >
                Add saved prompt
              </Button>
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
                Reusable prompts your team can run against this workbench with
                one click.
              </Body2P>
              <Button
                small
                onClick={() => {
                  navigate(getWorkbenchSavedPromptCreateAbsPath(workbenchId))
                }}
              >
                Add saved prompt
              </Button>
            </StretchedFlex>
            <Table
              hideHeader
              loose
              fullHeightWrap
              virtualizeRows
              data={prompts}
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
      <SavedPromptDeleteModal
        open={!!deletingPrompt}
        savedPrompt={deletingPrompt}
        onClose={() => setDeletingPrompt(null)}
      />
    </Flex>
  )
}

const columnHelper = createColumnHelper<WorkbenchPromptFragment>()
function getColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (savedPrompt: WorkbenchPromptFragment) => void
  onDelete: (savedPrompt: WorkbenchPromptFragment) => void
}) {
  return [
    columnHelper.accessor((savedPrompt) => savedPrompt, {
      id: 'details',
      meta: { truncate: true, gridTemplate: 'minmax(0, 1fr)' },
      cell: ({ getValue }) => {
        const savedPrompt = getValue()

        return (
          <StackedText
            truncate
            first={savedPrompt.prompt || 'Saved prompt'}
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
            tooltip="Edit saved prompt"
            icon={<PencilIcon />}
            onClick={() => onEdit(row.original)}
          />
          <IconFrame
            clickable
            tooltip="Delete saved prompt"
            icon={<TrashCanIcon color="icon-danger" />}
            onClick={() => onDelete(row.original)}
          />
        </Flex>
      ),
    }),
  ]
}
