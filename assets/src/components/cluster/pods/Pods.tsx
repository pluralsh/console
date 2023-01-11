import { useMemo } from 'react'
import { useQuery } from 'react-apollo'
import { sumBy } from 'lodash'

import { Flex } from 'honorable'
import { Card, LoopingLogo, PageTitle } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/layout/ScrollablePage'

import type { Node, NodeMetric, Pod } from 'generated/graphql'
import { cpuParser, memoryParser } from 'utils/kubernetes'

import { PODS_Q } from '../queries'

import { POLL_INTERVAL } from '../constants'

import {
  ColContainers,
  ColCpu,
  ColDelete,
  ColMemory,
  ColNameLink,
  ColNamespace,
  ColNodeName,
  ColRestarts,
  PodsList,
} from './PodsList'

export default function AllPods() {
  const { data, refetch, error } = useQuery<{
    pods: Pod[]
  }>(PODS_Q, {
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const columns = useMemo(() => [
    ColNameLink,
    ColNamespace,
    ColNodeName,
    ColMemory,
    ColCpu,
    ColRestarts,
    ColContainers,
    ColDelete(refetch),
  ],
  [refetch])

  if (error) {
    console.log('error', error)
  }

  if (!data) {
    return <LoopingLogo />
  }

  return (
    <Flex
      direction="column"
      gap="xlarge"
    >
      <PageTitle heading="Pods" />
      hello
      <PodsList
        pods={data.pods}
        columns={columns}
      />
    </Flex>
  )
}
