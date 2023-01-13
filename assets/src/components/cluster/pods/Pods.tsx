import { useMemo } from 'react'
import { useQuery } from '@apollo/client'

import { Flex } from 'honorable'
import { LoopingLogo, PageTitle } from '@pluralsh/design-system'

import type { Pod } from 'generated/graphql'

import { PODS_Q } from '../queries'

import { POLL_INTERVAL } from '../constants'

import {
  ColActions,
  ColContainers,
  ColCpuReservations,
  ColMemoryReservations,
  ColNameLink,
  ColNamespace,
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
    ColMemoryReservations,
    ColCpuReservations,
    ColRestarts,
    ColContainers,
    ColActions(refetch),
  ],
  [refetch])

  console.log('error', error)

  if (!data) {
    return <LoopingLogo />
  }

  return (
    <Flex
      direction="column"
      gap="xlarge"
    >
      <PageTitle heading="Pods" />
      <PodsList
        pods={data.pods}
        columns={columns}
      />
    </Flex>
  )
}
