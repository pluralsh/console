import { Input, SearchIcon, SubTab, TabList } from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import {
  Dispatch,
  MutableRefObject,
  ReactNode,
  SetStateAction,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import { useVClustersQuery } from '../../../generated/graphql'
import { useProjectId } from '../../contexts/ProjectsContext'
import { GqlError } from '../../utils/Alert'
import LoadingIndicator from '../../utils/LoadingIndicator'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from '../../utils/table/useFetchPaginatedData'
import { ClustersTable } from '../clusters/Clusters'
import { ClusterStatusTabKey, statusTabs } from '../services/ClustersFilters'

export default function VClusters(): ReactNode {
  const theme = useTheme()
  const { clusterId } = useParams<{ clusterId: string }>()
  const projectId = useProjectId()
  const tabStateRef = useRef<any>(null)
  const [statusFilter, setStatusFilter] = useState<ClusterStatusTabKey>('ALL')
  const [searchString, setSearchString] = useState<string>()
  const debouncedSearchString = useDebounce(searchString, 100)

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    {
      queryHook: useVClustersQuery,
      keyPath: ['clusters'],
    },
    {
      parentId: clusterId ?? '',
      q: debouncedSearchString,
      projectId,
      ...(statusFilter !== 'ALL'
        ? { healthy: statusFilter === 'HEALTHY' }
        : {}),
    }
  )

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      <VirtualClustersFilters
        setQueryStatusFilter={setStatusFilter}
        setQueryString={setSearchString}
        tabStateRef={tabStateRef}
      />
      <ClustersTable
        fullHeightWrap
        data={data?.clusters?.edges ?? []}
        refetch={refetch}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        onVirtualSliceChange={setVirtualSlice}
      />
    </div>
  )
}

const VirtualClustersFilters = styled(UnstyledVirtualClustersFilters)(
  ({ theme }) => ({
    display: 'flex',
    flexGrow: 1,
    columnGap: theme.spacing.medium,
    '.statusTab': {
      display: 'flex',
      gap: theme.spacing.small,
      alignItems: 'center',
    },
  })
)

interface VirtualClustersFiltersProps {
  tabStateRef: MutableRefObject<any>
  setQueryStatusFilter: Dispatch<SetStateAction<ClusterStatusTabKey>>
  setQueryString: (string) => void
}

function UnstyledVirtualClustersFilters({
  tabStateRef,
  setQueryString,
  setQueryStatusFilter,
  ...props
}: VirtualClustersFiltersProps): ReactNode {
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString, 400)
  const [statusFilter, setStatusFilter] = useState<ClusterStatusTabKey>('ALL')
  const deferredStatusFilter = useDeferredValue(statusFilter)

  useEffect(() => {
    setQueryString(debouncedSearchString)
  }, [searchString, debouncedSearchString, setQueryString])

  useEffect(() => {
    setQueryStatusFilter(deferredStatusFilter)
  }, [setQueryStatusFilter, deferredStatusFilter])

  return (
    <div {...props}>
      <div css={{ flex: '1' }}>
        <Input
          placeholder="Search"
          startIcon={<SearchIcon />}
          value={searchString}
          onChange={(e) => {
            setSearchString(e.currentTarget.value)
          }}
        />
      </div>
      <TabList
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: statusFilter,
          onSelectionChange: (key) => {
            setStatusFilter(key as ClusterStatusTabKey)
          },
        }}
      >
        {statusTabs?.map(([key, { label }]) => (
          <SubTab
            key={key}
            textValue={label}
            className="statusTab"
          >
            {label}
          </SubTab>
        ))}
      </TabList>
    </div>
  )
}
