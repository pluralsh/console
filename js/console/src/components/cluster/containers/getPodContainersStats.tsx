import { Pod } from 'generated/graphql'
import { Readiness, containerStatusToReadiness } from 'utils/status'
import { ContainerStatusT } from '../../cd/cluster/pod/PodsList.tsx'

function getAllContainerStatuses({
  containerStatuses,
  initContainerStatuses,
}: Pod['status']) {
  return [...(initContainerStatuses || []), ...(containerStatuses || [])]
}

export function getPodContainersStats(podStatus: Pod['status']): {
  ready?: number
  total?: number
  statuses?: ContainerStatusT[]
} {
  const allStatuses = getAllContainerStatuses(podStatus)

  const readyCount = allStatuses.reduce(
    (prev, status) => {
      if (!status) {
        return prev
      }
      const readiness = containerStatusToReadiness(status)

      return {
        ready: prev.ready + (readiness === Readiness.Ready ? 1 : 0),
        total: prev.total + 1,
      }
    },
    { ready: 0, total: 0 }
  )

  const statuses = allStatuses.map(
    (status) =>
      ({
        name: status?.name,
        readiness: containerStatusToReadiness(status),
      }) as ContainerStatusT
  )

  return { statuses, ...readyCount }
}
