import type {
  ClusterTinyFragment,
  ServiceDeploymentsRowFragment,
  StackTinyFragment,
  WorkbenchSkillTinyFragment,
} from 'generated/graphql'

export type MentionKind = 'cluster' | 'service' | 'stack' | 'skill'

export type ClusterMentionItem = { kind: 'cluster' } & Pick<
  ClusterTinyFragment,
  'id' | 'name' | 'handle' | 'distro' | 'provider'
>

export type ServiceMentionItem = { kind: 'service' } & Pick<
  ServiceDeploymentsRowFragment,
  'id' | 'name' | 'namespace' | 'cluster'
>

// StackTiny.id is nullable on the schema; we never build a mention item
// without one (filtered in useMentionDataSources), so narrow it here.
export type StackMentionItem = { kind: 'stack' } & Pick<
  StackTinyFragment,
  'name' | 'type'
> & { id: string }

export type SkillMentionItem = { kind: 'skill' } & Pick<
  WorkbenchSkillTinyFragment,
  'id' | 'name' | 'description' | 'subagents'
>

export type MentionItem =
  | ClusterMentionItem
  | ServiceMentionItem
  | StackMentionItem
  | SkillMentionItem

export type MentionTrigger = '@' | '/'

export const MENTION_TRIGGERS: ReadonlyArray<MentionTrigger> = ['@', '/']

export function kindsForTrigger(
  trigger: MentionTrigger
): ReadonlyArray<MentionKind> {
  return trigger === '@' ? ['cluster', 'service', 'stack'] : ['skill']
}
