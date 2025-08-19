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
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { ScalingRecommendationType } from 'generated/graphql'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CMContextType } from '../CostManagementDetails'
import {
  ColContainer,
  ColCpuChange,
  ColMemoryChange,
  ColName,
  ColScalingPr,
  ColService,
} from './ClusterScalingRecsTableCols'

import {
  COST_MANAGEMENT_ABS_PATH,
  COST_MANAGEMENT_REL_PATH,
} from 'routes/costManagementRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'

const getBreadcrumbs = (clusterName: string) => [
  { label: COST_MANAGEMENT_REL_PATH, url: COST_MANAGEMENT_ABS_PATH },
  { label: clusterName },
  { label: 'recommendations' },
]

export function CostManagementDetailsRecommendations() {
  const {
    recommendationsQuery,
    recommendationsQ,
    setRecommendationsQ,
    recType,
    setRecType,
    clusterName,
  } = useOutletContext<CMContextType>()

  useSetBreadcrumbs(
    useMemo(() => getBreadcrumbs(clusterName ?? ''), [clusterName])
  )

  const { data, loading, error, fetchNextPage, setVirtualSlice } =
    recommendationsQuery

  const recs = useMemo(
    () => mapExistingNodes(data?.clusterUsage?.recommendations),
    [data?.clusterUsage?.recommendations]
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
      {error ? (
        <GqlError error={error} />
      ) : (
        <Table
          fullHeightWrap
          virtualizeRows
          fillLevel={1}
          rowBg="base"
          columns={cols}
          data={recs}
          loading={!data && loading}
          hasNextPage={
            data?.clusterUsage?.recommendations?.pageInfo?.hasNextPage
          }
          isFetchingNextPage={loading}
          fetchNextPage={fetchNextPage}
          onVirtualSliceChange={setVirtualSlice}
        />
      )}
    </Flex>
  )
}

const cols = [
  ColName,
  ColContainer,
  ColCpuChange,
  ColMemoryChange,
  ColService,
  ColScalingPr,
]
