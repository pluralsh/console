import {
  ICON_FRAME_ICON_SIZE,
  Flex,
  ListBoxFooterPlus,
  ListBoxItem,
  Select,
  SelectButton,
  Table,
  TrashCanIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import {
  PageToolbarPortal,
  ToolbarSearchInput,
} from 'components/layout/PageToolbar'
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
  ColService,
  getColScalingPr,
} from './ClusterScalingRecsTableCols'

import { COST_MANAGEMENT_ABS_PATH } from 'routes/costManagementRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'

const getBreadcrumbs = (clusterName: string) => [
  { label: 'cost management', url: COST_MANAGEMENT_ABS_PATH },
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
  const cluster = data?.clusterUsage?.cluster
  const cols = useMemo(
    () =>
      cluster
        ? [
            ColName,
            ColContainer,
            ColCpuChange,
            ColMemoryChange,
            ColService,
            getColScalingPr(cluster),
          ]
        : [ColName, ColContainer, ColCpuChange, ColMemoryChange, ColService],
    [cluster]
  )

  return (
    <Flex
      direction="column"
      gap="medium"
      overflow="hidden"
    >
      <PageToolbarPortal>
        <ToolbarSearchInput
          placeholder="Search by resource name"
          value={recommendationsQ}
          onChange={setRecommendationsQ}
        />
        <Select
          triggerButton={
            <SelectButton
              size="small"
              css={{ minWidth: 200 }}
            >
              {recType ?? 'Select type'}
            </SelectButton>
          }
          selectedKey={recType}
          onSelectionChange={(type) =>
            setRecType(type as ScalingRecommendationType)
          }
          dropdownFooter={
            <ListBoxFooterPlus
              leftContent={<TrashCanIcon size={ICON_FRAME_ICON_SIZE.small} />}
            >
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
      </PageToolbarPortal>
      {error ? (
        <GqlError error={error} />
      ) : (
        <Table
          key={cluster?.id ?? 'loading'}
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
