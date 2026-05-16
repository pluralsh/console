// Each value is the literal HTML tag name a chip serializes to, so kind and
// chip tag are the same string at runtime.
export enum MentionKind {
  Cluster = 'plrl-cluster',
  Service = 'plrl-service',
  Stack = 'plrl-stack',
  Skill = 'plrl-skill',
}

export const PLRL_CHIP_TAG_NAMES: readonly MentionKind[] =
  Object.values(MentionKind)

export const KIND_LABELS: Record<MentionKind, string> = {
  [MentionKind.Cluster]: 'cluster',
  [MentionKind.Service]: 'service',
  [MentionKind.Stack]: 'stack',
  [MentionKind.Skill]: 'skill',
}

// --- Triggers ---

export type MentionTrigger = '@' | '/'
export const MENTION_TRIGGERS: ReadonlyArray<MentionTrigger> = ['@', '/']

// --- Chip attributes ---
//
// Single shape per kind — used both by the autocomplete picker and by the
// chip DOM/XML serialization. Names avoid `id`/`name` so rehype-sanitize's
// default `clobber` doesn't rewrite chip data with the `user-content-` prefix.

type BaseChipAttrs<K extends MentionKind> = {
  kind: K
  'item-id': string
  'item-name': string
}

export type ClusterChipAttrs = BaseChipAttrs<MentionKind.Cluster> & {
  handle?: Nullable<string>
  distro?: Nullable<string>
  provider?: Nullable<string>
}

export type ServiceChipAttrs = BaseChipAttrs<MentionKind.Service> & {
  namespace?: Nullable<string>
  'cluster-id'?: string
  'cluster-name'?: string
  /** Cluster handle (from Cluster.handle); preferred for tool-style disambiguation */
  'cluster-handle'?: string
}

export type StackChipAttrs = BaseChipAttrs<MentionKind.Stack> & {
  type?: string
}

export type SkillChipAttrs = BaseChipAttrs<MentionKind.Skill> & {
  description?: string
  subagents?: string
}

export type ChipAttrsByKind = {
  [MentionKind.Cluster]: ClusterChipAttrs
  [MentionKind.Service]: ServiceChipAttrs
  [MentionKind.Stack]: StackChipAttrs
  [MentionKind.Skill]: SkillChipAttrs
}

export type ChipAttrs = ChipAttrsByKind[MentionKind]

// Drives the rehype-sanitize allowlist. The mapped type ensures every name
// here is a real attribute on the matching `*ChipAttrs`.
export const CHIP_ATTRIBUTE_SCHEMA: {
  [K in MentionKind]: Exclude<keyof ChipAttrsByKind[K], 'kind'>[]
} = {
  [MentionKind.Cluster]: [
    'item-id',
    'item-name',
    'handle',
    'distro',
    'provider',
  ],
  [MentionKind.Service]: [
    'item-id',
    'item-name',
    'namespace',
    'cluster-id',
    'cluster-name',
    'cluster-handle',
  ],
  [MentionKind.Stack]: ['item-id', 'item-name', 'type'],
  [MentionKind.Skill]: ['item-id', 'item-name', 'description', 'subagents'],
}

type ChipAttrRecord = Record<string, string | null | undefined>

/** Visible chip label in the editor, markdown pills, and prettify/truncation (no @ or / prefix). */
export function chipDisplayText(
  kind: MentionKind,
  attrs: ChipAttrRecord
): string {
  const name = attrs['item-name'] ?? ''
  switch (kind) {
    case MentionKind.Skill:
      return name
    case MentionKind.Cluster: {
      const h = attrs.handle
      if (h && name && h !== name) return `${name} (${h})`
      return name || h || ''
    }
    case MentionKind.Service: {
      const ch = attrs['cluster-handle'] ?? attrs['cluster-name']
      if (ch && name) return `${name} (${ch})`
      return name
    }
    case MentionKind.Stack:
    default:
      return name
  }
}
