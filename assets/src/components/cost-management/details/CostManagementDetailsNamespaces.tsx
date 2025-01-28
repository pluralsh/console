import {
  Card,
  CpuIcon,
  Flex,
  Input,
  NamespaceIcon,
  RamIcon,
  SearchIcon,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'

import { GqlError } from 'components/utils/Alert'
import { DEFAULT_REACT_VIRTUAL_OPTIONS } from 'components/utils/table/useFetchPaginatedData'
import { OverlineH1 } from 'components/utils/typography/Text'
import { ClusterNamespaceUsageFragment } from 'generated/graphql'
import { useMemo } from 'react'

import { useOutletContext } from 'react-router-dom'
import {
  COST_MANAGEMENT_ABS_PATH,
  COST_MANAGEMENT_REL_PATH,
} from 'routes/costManagementRoutesConsts'
import { useTheme } from 'styled-components'
import {
  ColCpuCost,
  ColLoadBalancerCost,
  ColMemoryCost,
  ColNamespace,
  ColNetworkCost,
} from '../ClusterUsagesTableCols'
import { CM_TREE_MAP_CARD_HEIGHT } from '../CostManagement'
import {
  CostManagementTreeMap,
  cpuCostByNamespace,
  memoryCostByNamespace,
} from '../CostManagementTreeMap'
import { CMContextType } from './CostManagementDetails'

const getBreadcrumbs = (clusterName: string) => [
  { label: COST_MANAGEMENT_REL_PATH, url: COST_MANAGEMENT_ABS_PATH },
  { label: clusterName },
  { label: 'namespaces' },
]

export function CostManagementDetailsNamespaces() {
  const theme = useTheme()

  const { namespacesQuery, namespaceQ, setNamespaceQ, clusterName } =
    useOutletContext<CMContextType>()

  useSetBreadcrumbs(
    useMemo(() => getBreadcrumbs(clusterName ?? ''), [clusterName])
  )

  const { data, loading, error, fetchNextPage, setVirtualSlice } =
    namespacesQuery

  const usages = useMemo(
    () =>
      data?.clusterUsage?.namespaces?.edges
        ?.map((edge) => edge?.node)
        .filter((node): node is ClusterNamespaceUsageFragment => !!node) || [],
    [data?.clusterUsage?.namespaces?.edges]
  )

  return (
    <Flex
      direction="column"
      gap="medium"
      paddingBottom={theme.spacing.large}
    >
      <Flex gap="large">
        <Card
          css={{
            padding: theme.spacing.large,

            height: CM_TREE_MAP_CARD_HEIGHT,
          }}
          header={{
            outerProps: { style: { flex: 1 } },
            content: (
              <Flex gap="small">
                <CpuIcon />
                <OverlineH1 as="h3">cpu cost by namespace</OverlineH1>
              </Flex>
            ),
          }}
        >
          <CostManagementTreeMap
            enableParentLabel={false}
            colorScheme="blue"
            data={cpuCostByNamespace(usages)}
            dataSize={usages.length}
          />
        </Card>
        <Card
          css={{
            padding: theme.spacing.large,
            height: CM_TREE_MAP_CARD_HEIGHT,
          }}
          header={{
            outerProps: { style: { flex: 1 } },
            content: (
              <Flex gap="small">
                <RamIcon />
                <OverlineH1 as="h3">memory cost by namespace</OverlineH1>
              </Flex>
            ),
          }}
        >
          <CostManagementTreeMap
            enableParentLabel={false}
            colorScheme="purple"
            data={memoryCostByNamespace(usages)}
            dataSize={usages.length}
          />
        </Card>
      </Flex>
      <Flex
        direction="column"
        gap="small"
        overflow="hidden"
      >
        <Input
          flexShrink={0}
          startIcon={<SearchIcon />}
          placeholder="Search by namespace"
          value={namespaceQ}
          onChange={(e) => setNamespaceQ(e.target.value)}
        />
        <Card
          css={{ overflow: 'hidden', maxHeight: 500 }}
          header={{
            content: (
              <Flex gap="small">
                <NamespaceIcon />
                <OverlineH1 as="h3">all namespaces</OverlineH1>
              </Flex>
            ),
          }}
        >
          {error ? (
            <GqlError error={error} />
          ) : (
            <Table
              fullHeightWrap
              fillLevel={1}
              virtualizeRows
              flush
              rowBg="base"
              loading={!data && loading}
              columns={cols}
              data={usages}
              hasNextPage={
                data?.clusterUsage?.namespaces?.pageInfo?.hasNextPage
              }
              isFetchingNextPage={loading}
              fetchNextPage={fetchNextPage}
              reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
              onVirtualSliceChange={setVirtualSlice}
            />
          )}
        </Card>
      </Flex>
    </Flex>
  )
}

const cols = [
  ColNamespace,
  ColCpuCost,
  ColMemoryCost,
  // ColStorageCost,
  ColLoadBalancerCost,
  ColNetworkCost,
]
