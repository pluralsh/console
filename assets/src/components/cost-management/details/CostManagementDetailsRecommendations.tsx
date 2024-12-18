import {
  Flex,
  Input,
  ListBoxFooterPlus,
  ListBoxItem,
  SearchIcon,
  Select,
  SelectButton,
  Table,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import {
  ClusterScalingRecommendationFragment,
  ScalingRecommendationType,
} from 'generated/graphql'
import { useOutletContext } from 'react-router-dom'
import {
  ColCpuChange,
  ColMemoryChange,
  ColName,
} from './ClusterScalingRecsTableCols'
import { CMContextType } from './CostManagementDetails'
import { useMemo } from 'react'
import { DEFAULT_REACT_VIRTUAL_OPTIONS } from 'components/utils/table/useFetchPaginatedData'
import { GqlError } from 'components/utils/Alert'

export function CostManagementDetailsRecommendations() {
  const {
    recommendationsQuery,
    recommendationsQ,
    setRecommendationsQ,
    recType,
    setRecType,
  } = useOutletContext<CMContextType>()

  const { data, loading, error, fetchNextPage, setVirtualSlice } =
    recommendationsQuery

  const recs = useMemo(
    () =>
      data?.clusterUsage?.recommendations?.edges
        ?.map((edge) => edge?.node)
        .filter(
          (node): node is ClusterScalingRecommendationFragment => !!node
        ) || [],
    [data?.clusterUsage?.recommendations?.edges]
  )

  return (
    <Flex
      direction="column"
      gap="medium"
      overflow="hidden"
    >
      <Flex gap="medium">
        <Input
          flex={1}
          startIcon={<SearchIcon />}
          placeholder="Search by resource name"
          value={recommendationsQ}
          onChange={(e) => setRecommendationsQ(e.target.value)}
        />
        <Select
          triggerButton={
            <SelectButton css={{ minWidth: 300 }}>
              {recType ?? 'Select type'}
            </SelectButton>
          }
          selectedKey={recType}
          onSelectionChange={(type) =>
            setRecType(type as ScalingRecommendationType)
          }
          dropdownFooter={
            <ListBoxFooterPlus leftContent={<TrashCanIcon />}>
              Clear Selection
            </ListBoxFooterPlus>
          }
          onFooterClick={() => setRecType(undefined)}
        >
          {Object.values(ScalingRecommendationType).map((type) => (
            <ListBoxItem
              key={`${type}`}
              label={type}
            />
          ))}
        </Select>
      </Flex>
      <FullHeightTableWrap>
        {error ? (
          <GqlError error={error} />
        ) : (
          <Table
            virtualizeRows
            fillLevel={1}
            rowBg="base"
            columns={cols}
            data={recs}
            loading={!data && loading}
            reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
            hasNextPage={
              data?.clusterUsage?.recommendations?.pageInfo?.hasNextPage
            }
            isFetchingNextPage={loading}
            fetchNextPage={fetchNextPage}
            setVirtualSlice={setVirtualSlice}
          />
        )}
      </FullHeightTableWrap>
    </Flex>
  )
}

const cols = [ColName, ColCpuChange, ColMemoryChange]
