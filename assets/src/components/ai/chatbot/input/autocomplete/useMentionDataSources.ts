import { useThrottle } from 'components/hooks/useThrottle'
import {
  useClusterSelectorQuery,
  useServiceDeploymentsQuery,
  useStacksQuery,
  useWorkbenchSkillsQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import {
  ClusterMentionItem,
  MentionItem,
  MentionTrigger,
  ServiceMentionItem,
  SkillMentionItem,
  StackMentionItem,
} from './mentionTypes'

const MAX_PER_KIND = 8
const QUERY_THROTTLE_MS = 200

export function useMentionDataSources({
  trigger,
  query,
  workbenchId,
  enabled,
}: {
  trigger: MentionTrigger | null
  query: string
  workbenchId?: Nullable<string>
  enabled: boolean
}): { items: MentionItem[]; loading: boolean } {
  const throttled = useThrottle(query, QUERY_THROTTLE_MS)
  const wantsAt = enabled && trigger === '@'
  const wantsSlash = enabled && trigger === '/'

  const { data: clusterData, loading: clustersLoading } =
    useClusterSelectorQuery({
      variables: { q: throttled || null, first: MAX_PER_KIND },
      skip: !wantsAt,
      fetchPolicy: 'cache-and-network',
    })

  const { data: serviceData, loading: servicesLoading } =
    useServiceDeploymentsQuery({
      variables: { q: throttled || undefined, first: MAX_PER_KIND },
      skip: !wantsAt,
      fetchPolicy: 'cache-and-network',
    })

  const { data: stackData, loading: stacksLoading } = useStacksQuery({
    variables: { q: throttled || undefined, first: MAX_PER_KIND },
    skip: !wantsAt,
    fetchPolicy: 'cache-and-network',
  })

  const { data: skillData, loading: skillsLoading } = useWorkbenchSkillsQuery({
    variables: { id: workbenchId ?? '', first: 500 },
    skip: !wantsSlash || !workbenchId,
    fetchPolicy: 'cache-and-network',
  })

  const clusters = useMemo<ClusterMentionItem[]>(() => {
    if (!wantsAt) return []
    return mapExistingNodes(clusterData?.clusters)
      .filter((n) => !!n.id)
      .map((n) => ({ kind: 'cluster' as const, ...n }))
  }, [clusterData, wantsAt])

  const services = useMemo<ServiceMentionItem[]>(() => {
    if (!wantsAt) return []
    return mapExistingNodes(serviceData?.serviceDeployments)
      .filter((n) => !!n.id)
      .map((n) => ({ kind: 'service' as const, ...n }))
  }, [serviceData, wantsAt])

  const stacks = useMemo<StackMentionItem[]>(() => {
    if (!wantsAt) return []
    return mapExistingNodes(stackData?.infrastructureStacks)
      .filter((n): n is typeof n & { id: string } => !!n.id)
      .map((n) => ({ kind: 'stack' as const, ...n }))
  }, [stackData, wantsAt])

  const skills = useMemo<SkillMentionItem[]>(() => {
    if (!wantsSlash) return []
    const all: SkillMentionItem[] = mapExistingNodes(
      skillData?.workbench?.workbenchSkills
    ).map((n) => ({ kind: 'skill' as const, ...n }))
    if (!throttled) return all.slice(0, MAX_PER_KIND)
    const q = throttled.toLowerCase()
    return all
      .filter(
        (s) =>
          (s.name ?? '').toLowerCase().includes(q) ||
          (s.description ?? '').toLowerCase().includes(q)
      )
      .slice(0, MAX_PER_KIND)
  }, [skillData, wantsSlash, throttled])

  const items = useMemo<MentionItem[]>(() => {
    if (wantsAt) return [...clusters, ...services, ...stacks]
    if (wantsSlash) return skills
    return []
  }, [wantsAt, wantsSlash, clusters, services, stacks, skills])

  const loading = wantsAt
    ? clustersLoading || servicesLoading || stacksLoading
    : wantsSlash
      ? skillsLoading
      : false

  return { items, loading }
}
