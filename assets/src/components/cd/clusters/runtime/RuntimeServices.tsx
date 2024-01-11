import { Tab, TabList, TabPanel, Table } from '@pluralsh/design-system'
import { ClustersRowFragment, useRuntimeServicesQuery } from 'generated/graphql'
import { Key, useMemo, useRef, useState } from 'react'

import { useTheme } from 'styled-components'

import { isNonNullable } from 'utils/isNonNullable'

import { runtimeColumns } from './columns'
import ExpandedColumn from './ExpandedColumn'

const POLL_INTERVAL = 10 * 1000

export function getClusterKubeVersion(
  cluster: Nullable<Pick<ClustersRowFragment, 'currentVersion' | 'version'>>
) {
  return cluster?.currentVersion || cluster?.version || '1.20.0'
}

export default function RuntimeServices({
  cluster,
}: {
  cluster?: ClustersRowFragment | undefined | null
}) {
  const theme = useTheme()
  const kubeVersion = getClusterKubeVersion(cluster)
  const tabStateRef = useRef<any>()
  const [tabKey, setTabKey] = useState<Key>('blocking')
  const { data } = useRuntimeServicesQuery({
    variables: {
      kubeVersion,
      id: cluster?.id ?? '',
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const { blocking, all } = useMemo(() => {
    const all = data?.cluster?.runtimeServices?.filter(isNonNullable) || []

    return {
      all,
      blocking: all.filter((addOn) => !!addOn.addonVersion?.blocking),
    }
  }, [data?.cluster?.runtimeServices])

  if ((data?.cluster?.runtimeServices || []).length <= 0) return null

  return (
    <>
      <div
        css={{
          ...theme.partials.text.body1,
          color: theme.colors['text-light'],
        }}
      >
        We detected these Kubernetes add-ons in your cluster. You should
        validate they are compatible before upgrading.
      </div>
      <TabList
        stateRef={tabStateRef}
        stateProps={{
          orientation: 'horizontal',
          selectedKey: tabKey,
          onSelectionChange: setTabKey,
        }}
      >
        <Tab key="blocking">Blocking Add-ons ({blocking.length})</Tab>
        <Tab key="all">All Add-ons ({all.length})</Tab>
      </TabList>
      <TabPanel stateRef={tabStateRef}>
        <Table
          data={tabKey === 'blocking' ? blocking : all}
          columns={runtimeColumns}
          getRowCanExpand={() => true}
          renderExpanded={({ row }) => (
            <ExpandedColumn runtimeService={row.original} />
          )}
          css={{
            maxHeight: 258,
            height: '100%',
          }}
        />
      </TabPanel>
    </>
  )
}
