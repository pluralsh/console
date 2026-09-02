import {
  Button,
  FiltersIcon,
  Flex,
  Input2,
  SearchIcon,
} from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { WorkbenchIssuesTable } from 'components/workbenches/common/WorkbenchIssuesTable'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useWorkbenchIssuesQuery } from 'generated/graphql'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WORKBENCH_PARAM_ID } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchPageLayout } from './Workbench'
import { WorkbenchIssuesDisplayPanel } from './WorkbenchIssuesDisplayPanel'

export function WorkbenchIssues() {
  const workbenchId = useParams()[WORKBENCH_PARAM_ID] ?? ''
  const [searchString, setSearchString] = useState('')
  const [displayOpen, setDisplayOpen] = useState(false)
  const debouncedSearchString = useDebounce(searchString.trim(), 200)

  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useWorkbenchIssuesQuery, keyPath: ['workbench', 'issues'] },
      { id: workbenchId, q: debouncedSearchString || undefined }
    )
  const issues = useMemo(
    () => mapExistingNodes(data?.workbench?.issues),
    [data]
  )

  return (
    <WorkbenchPageLayout>
      {error ? (
        <GqlError error={error} />
      ) : (
        <WrapperSC>
          <ToolbarSC>
            <Input2
              showClearButton
              css={{ flex: 1 }}
              placeholder="Search issues"
              startIcon={<SearchIcon />}
              value={searchString}
              onChange={(e) => setSearchString(e.currentTarget.value)}
            />
            <Button
              secondary
              startIcon={<FiltersIcon />}
              onClick={() => setDisplayOpen(!displayOpen)}
            >
              Display
            </Button>
          </ToolbarSC>
          <ContentSC>
            <TableContainerSC>
              <WorkbenchIssuesTable
                issues={issues}
                loading={!data && loading}
                hasNextPage={pageInfo?.hasNextPage}
                fetchNextPage={fetchNextPage}
                setVirtualSlice={setVirtualSlice}
                fallbackWorkbenchId={workbenchId}
              />
            </TableContainerSC>
            {displayOpen && <WorkbenchIssuesDisplayPanel />}
          </ContentSC>
        </WrapperSC>
      )}
    </WorkbenchPageLayout>
  )
}

const WrapperSC = styled(Flex)(({ theme }) => ({
  flexDirection: 'column',
  flex: 1,
  gap: theme.spacing.medium,
  minHeight: 160,
  overflow: 'hidden',
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
}))

const ToolbarSC = styled(Flex)(({ theme }) => ({
  alignItems: 'center',
  gap: theme.spacing.medium,
}))

const ContentSC = styled(Flex)(({ theme }) => ({
  flex: 1,
  gap: theme.spacing.medium,
  minHeight: 0,
}))

const TableContainerSC = styled.div({
  flex: 1,
  minHeight: 0,
  minWidth: 0,
})
