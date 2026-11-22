import Fuse from 'fuse.js'
import { DevboxCommandFragment } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

export type DevboxSlashQuery = { query: string; end: number }

// ACP runs a command when the prompt starts with `/<name>`, so completion
// only applies to the prompt's first token
export function getSlashQuery(
  text: string,
  caret: number = text.length
): Nullable<DevboxSlashQuery> {
  if (!text.startsWith('/')) return null
  const match = /^\/(\S*)/.exec(text)
  const end = match ? match[0].length : 1
  if (caret > end) return null
  return { query: match?.[1] ?? '', end }
}

export function matchSlashCommands(
  commands: Nullable<Nullable<DevboxCommandFragment>[]>,
  query: string
): DevboxCommandFragment[] {
  const list = (commands ?? []).filter(isNonNullable)
  if (!query) return list.toSorted((a, b) => a.name.localeCompare(b.name))

  const q = query.toLowerCase()
  const prefix = list.filter(({ name }) => name.toLowerCase().startsWith(q))
  const rest = new Fuse(
    list.filter((c) => !prefix.includes(c)),
    {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'description', weight: 1 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    }
  )
    .search(query)
    .map(({ item }) => item)

  return [
    ...prefix.toSorted(
      (a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name)
    ),
    ...rest,
  ]
}

// adapters namespace commands (`skill:review`, `mcp:server:prompt`); the
// prefix is the closest thing to a source GraphQL exposes
export function slashCommandGroup({ name }: DevboxCommandFragment) {
  const idx = name.indexOf(':')
  if (idx <= 0) return 'Commands'
  const prefix = name.slice(0, idx)
  return prefix === 'skill'
    ? 'Skills'
    : prefix === 'mcp'
      ? 'MCP prompts'
      : prefix
}

export function groupSlashCommands(commands: DevboxCommandFragment[]) {
  const groups = new Map<string, DevboxCommandFragment[]>()
  for (const cmd of commands) {
    const group = slashCommandGroup(cmd)
    groups.set(group, [...(groups.get(group) ?? []), cmd])
  }
  return [...groups.entries()].map(([label, items]) => ({ label, items }))
}

export const SLASH_COMMAND_ATTR = 'data-slash-command'

// styled in the composer, but not a serialized chip: it contributes its plain
// `/name` text, which is how agents recognize a command
export function slashCommandChip(name: string): HTMLElement {
  const chip = document.createElement('span')
  chip.setAttribute(SLASH_COMMAND_ATTR, 'true')
  chip.setAttribute('contenteditable', 'false')
  chip.textContent = `/${name}`
  return chip
}

export function applySlashCommand(
  text: string,
  command: DevboxCommandFragment
) {
  const rest = text.replace(/^\/\S*\s?/, '')
  return `/${command.name} ${rest}`
}

// the selected command's input hint, shown while its input is still empty
export function slashCommandHint(
  text: string,
  commands: Nullable<Nullable<DevboxCommandFragment>[]>
): Nullable<string> {
  const match = /^\/(\S+) $/.exec(text)
  if (!match) return null
  return commands?.find((c) => c?.name === match[1])?.inputHint ?? null
}
