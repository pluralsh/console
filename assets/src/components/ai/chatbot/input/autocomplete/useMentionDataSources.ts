import Fuse from 'fuse.js'
import { useThrottle } from 'components/hooks/useThrottle'
import {
  useClustersTinyQuery,
  useServiceDeploymentsQuery,
  useStacksQuery,
  useWorkbenchSkillsQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import {
  ChipAttrs,
  ClusterChipAttrs,
  MentionKind,
  MentionTrigger,
  ServiceChipAttrs,
  SkillChipAttrs,
  StackChipAttrs,
} from './mentionTypes'
import { isEmpty } from 'lodash'

const MAX_PER_KIND = 8
const QUERY_THROTTLE_MS = 200

const skillFuseOptions = { keys: ['item-name', 'description'], threshold: 0.5 }

export function useMentionDataSources({
  trigger,
  query,
  workbenchId,
  flowId,
  enabled,
}: {
  trigger: MentionTrigger | null
  query: string
  workbenchId?: Nullable<string>
  flowId?: Nullable<string>
  enabled: boolean
}): { items: ChipAttrs[]; loading: boolean } {
  const throttled = useThrottle(query, QUERY_THROTTLE_MS)
  const wantsAt = enabled && trigger === '@'
  const wantsSlash = enabled && trigger === '/'
  const baseAtVariables = { q: throttled || undefined, first: MAX_PER_KIND }
  const atOptions = {
    variables: baseAtVariables,
    skip: !wantsAt,
    fetchPolicy: 'cache-and-network' as const,
  }
  const {
    data: cluCur,
    previousData: cluPrev,
    loading: clustersLoading,
  } = useClustersTinyQuery({ ...atOptions, skip: !wantsAt || !!flowId })
  const clusterData = cluCur || cluPrev

  const {
    data: svcCur,
    previousData: svcPrev,
    loading: servicesLoading,
  } = useServiceDeploymentsQuery({
    variables: { ...baseAtVariables, flowId: flowId || undefined },
    skip: !wantsAt,
    fetchPolicy: 'cache-and-network',
  })
  const serviceData = svcCur || svcPrev

  const {
    data: stkCur,
    previousData: stkPrev,
    loading: stacksLoading,
  } = useStacksQuery({ ...atOptions, skip: !wantsAt || !!flowId })
  const stackData = stkCur || stkPrev

  const {
    data: sklData,
    previousData: sklPreviousData,
    loading: skillsLoading,
  } = useWorkbenchSkillsQuery({
    variables: { id: workbenchId ?? '' },
    skip: !wantsSlash || !workbenchId,
    fetchPolicy: 'cache-and-network',
  })
  const skillData = sklData || sklPreviousData

  const clusters = useMemo<ClusterChipAttrs[]>(
    () =>
      mapExistingNodes(clusterData?.clusters)
        .filter((n) => !!n.id)
        .map(({ id, name, handle, distro, provider }) => ({
          kind: MentionKind.Cluster,
          'item-id': id,
          'item-name': name ?? '',
          handle,
          distro,
          provider: provider?.cloud ?? undefined,
        })),
    [clusterData]
  )

  const services = useMemo<ServiceChipAttrs[]>(
    () =>
      mapExistingNodes(serviceData?.serviceDeployments)
        .filter((n) => !!n.id)
        .map((n) => ({
          kind: MentionKind.Service,
          'item-id': n.id,
          'item-name': n.name,
          namespace: n.namespace ?? undefined,
          'cluster-id': n.cluster?.id ?? undefined,
          'cluster-name': n.cluster?.name ?? undefined,
          'cluster-handle': n.cluster?.handle ?? undefined,
        })),
    [serviceData]
  )

  const stacks = useMemo<StackChipAttrs[]>(
    () =>
      mapExistingNodes(stackData?.infrastructureStacks)
        .filter((n): n is typeof n & { id: string } => !!n.id)
        .map((n) => ({
          kind: MentionKind.Stack,
          'item-id': n.id,
          'item-name': n.name,
          type: n.type ?? undefined,
        })),
    [stackData]
  )

  const skills = useMemo<SkillChipAttrs[]>(() => {
    const all = (skillData?.workbench?.allSkills ?? [])
      .flatMap((n) => (n ? [n] : []))
      .map(
        (n): SkillChipAttrs => ({
          kind: MentionKind.Skill,
          'item-id': n.id ?? `skill:${n.name ?? ''}`,
          'item-name': n.name ?? '',
          description: n.description ?? undefined,
          subagents: n.subagents?.flatMap((s) => (s ? [s] : [])).join(','),
        })
      )

    if (!throttled) return all.slice(0, MAX_PER_KIND)
    return new Fuse(all, skillFuseOptions)
      .search(throttled)
      .slice(0, MAX_PER_KIND)
      .map(({ item }) => item)
  }, [skillData, throttled])

  const items = useMemo<ChipAttrs[]>(() => {
    if (wantsAt)
      return flowId ? services : [...clusters, ...services, ...stacks]
    if (wantsSlash) return skills
    return []
  }, [wantsAt, wantsSlash, flowId, clusters, services, stacks, skills])

  const loading = wantsAt
    ? flowId
      ? isEmpty(services) && servicesLoading
      : isEmpty(clusters) &&
        isEmpty(services) &&
        isEmpty(stacks) &&
        (clustersLoading || servicesLoading || stacksLoading)
    : wantsSlash
      ? isEmpty(skills) && skillsLoading
      : false

  return { items, loading }
}
