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
  ColCpuReservation,
  ColMemoryReservation,
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
    ColMemoryReservation,
    ColCpuReservation,
    ColRestarts,
    ColContainers,
    ColActions(refetch),
  ],
  [refetch])

  if (error) {
    return 'Sorry, something went wrong'
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
      <PodsList
        pods={data.pods}
        columns={columns}
      />
    </Flex>
  )
}
