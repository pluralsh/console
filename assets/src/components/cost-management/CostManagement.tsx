import {
  Card,
  ClusterIcon,
  CpuIcon,
  Flex,
  RamIcon,
  Table,
  TagMultiSelectProps,
} from '@pluralsh/design-system'
import { TagsFilter } from 'components/cd/services/ClusterTagsFilter'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { OverlineH1, Subtitle1H1 } from 'components/utils/typography/Text'
import {
  ClusterUsageTinyFragment,
  Conjunction,
  useClusterUsagesQuery,
} from 'generated/graphql'
import { Key, useState } from 'react'
import styled, { useTheme } from 'styled-components'

export function CostManagement() {
  const theme = useTheme()
  const [selectedTagKeys, setSelectedTagKeys] = useState<Set<Key>>(new Set())
  const [tagOp, setTagOp] = useState<Conjunction>(Conjunction.Or)

  const { data, loading, error } = useFetchPaginatedData({
    queryHook: useClusterUsagesQuery,
    pageSize: 500,
    keyPath: ['clusterUsages'],
  })

  const usages =
    data?.clusterUsages?.edges
      ?.map((edge) => edge?.node)
      .filter((node): node is ClusterUsageTinyFragment => !!node) || []

  return (
    <WrapperSC>
      <Flex
        justify="space-between"
        align="center"
      >
        <Subtitle1H1>Cost Management</Subtitle1H1>
        <TagsFilter
          selectedTagKeys={selectedTagKeys}
          setSelectedTagKeys={setSelectedTagKeys}
          searchOp={tagOp}
          setSearchOp={setTagOp as TagMultiSelectProps['onChangeMatchType']}
        />
      </Flex>
      <Flex gap="large">
        <Card
          css={{ padding: theme.spacing.large }}
          header={{
            outerProps: { style: { flex: 1 } },
            content: (
              <Flex gap="small">
                <CpuIcon />
                <OverlineH1 as="h3">cpu cost by cluster</OverlineH1>
              </Flex>
            ),
          }}
        >
          Graph goes here
        </Card>
        <Card
          css={{ padding: theme.spacing.large }}
          header={{
            outerProps: { style: { flex: 1 } },
            content: (
              <Flex gap="small">
                <RamIcon />
                <OverlineH1 as="h3">memory cost by cluster</OverlineH1>
              </Flex>
            ),
          }}
        >
          Graph goes here
        </Card>
      </Flex>
      <Card
        header={{
          content: (
            <Flex gap="small">
              <ClusterIcon />
              <OverlineH1 as="h3">clusters</OverlineH1>
            </Flex>
          ),
        }}
      >
        {error ? (
          <GqlError error={error} />
        ) : (
          <Table
            fillLevel={1}
            flush
            rowBg="base"
            loading={!data && loading}
            // TODO
            columns={[{ key: 'name', label: 'name', id: 'name' }]}
            data={usages}
          />
        )}
      </Card>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  height: '100%',
  width: '100%',
  padding: theme.spacing.large,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
}))
