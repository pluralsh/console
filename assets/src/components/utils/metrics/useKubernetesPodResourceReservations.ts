import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  getDaemonSetPods,
  getDeploymentNewReplicaSet,
  getReplicaSetPods,
  getStatefulSetPods,
} from 'generated/kubernetes'
import { AxiosInstance } from 'helpers/axios.ts'
import {
  PodResourceReservation,
  getPodResourceReservationsFromList,
} from 'components/utils/metrics/podResourceReservations.ts'

const PODS_PAGE_SIZE = 100

export function useKubernetesPodResourceReservations({
  clusterId,
  enabled,
  kind,
  name,
  namespace,
}: {
  clusterId: string
  enabled: boolean
  kind: string
  name: string
  namespace: string
}): PodResourceReservation[] {
  const client = useMemo(() => AxiosInstance(clusterId), [clusterId])
  const normalizedKind = kind.toLowerCase()
  const isDeployment = normalizedKind === 'deployment'
  const isDaemonSet = normalizedKind === 'daemonset'
  const isStatefulSet = normalizedKind === 'statefulset'
  const isSupportedKind = isDeployment || isDaemonSet || isStatefulSet

  const newReplicaSetQuery = useQuery({
    queryKey: ['deploymentNewReplicaSet', clusterId, namespace, name] as const,
    queryFn: async ({ signal }) => {
      const { data } = await getDeploymentNewReplicaSet({
        client,
        path: { deployment: name, namespace },
        signal,
        throwOnError: true,
      })

      return data
    },
    enabled: enabled && isDeployment && !!clusterId && !!name && !!namespace,
    refetchInterval: 30_000,
  })

  const replicaSetName = newReplicaSetQuery.data?.objectMeta?.name
  const replicaSetNamespace =
    newReplicaSetQuery.data?.objectMeta?.namespace ?? namespace
  const podsQuery = useQuery({
    queryKey: [
      'workloadPods',
      clusterId,
      normalizedKind,
      namespace,
      name,
      replicaSetName,
      replicaSetNamespace,
    ] as const,
    queryFn: async ({ signal }) => {
      const getPodsPage = async (page: number) => {
        const options = {
          client,
          query: { itemsPerPage: `${PODS_PAGE_SIZE}`, page: `${page}` },
          signal,
          throwOnError: true,
        } as const

        if (isDeployment) {
          const { data } = await getReplicaSetPods({
            ...options,
            path: {
              replicaSet: replicaSetName ?? '',
              namespace: replicaSetNamespace,
            },
          })

          return data
        }

        if (isDaemonSet) {
          const { data } = await getDaemonSetPods({
            ...options,
            path: { daemonSet: name, namespace },
          })

          return data
        }

        if (isStatefulSet) {
          const { data } = await getStatefulSetPods({
            ...options,
            path: { statefulset: name, namespace },
          })

          return data
        }

        throw new Error(`Unsupported workload kind: ${kind}`)
      }

      let page = 1
      let response = await getPodsPage(page)
      const pods = [...response.pods]
      const totalItems = response.listMeta.totalItems

      while (pods.length < totalItems && response.pods.length > 0) {
        page += 1
        response = await getPodsPage(page)
        pods.push(...response.pods)
      }

      return {
        ...response,
        listMeta: { ...response.listMeta, totalItems },
        pods,
      }
    },
    enabled:
      enabled &&
      !!clusterId &&
      !!name &&
      !!namespace &&
      isSupportedKind &&
      (!isDeployment || (!!replicaSetName && !!replicaSetNamespace)),
    refetchInterval: 30_000,
  })

  return useMemo(
    () => getPodResourceReservationsFromList(podsQuery.data?.pods),
    [podsQuery.data?.pods]
  )
}
