import { useDevboxChangesQuery } from 'generated/graphql'
import { useMemo } from 'react'
import {
  DevboxChangedFile,
  DevboxChangeGroup,
  toChangeGroups,
} from './devboxWorkspaceApi'

// the change selection that shows every diff at once
export const ALL_CHANGES = '*'

const POLL_INTERVAL = 15_000

// a changed file's selection key, which is also the path the files api reads it at
export const changeKey = (group: DevboxChangeGroup, file: DevboxChangedFile) =>
  group.path ? `${group.path}/${file.path}` : file.path

// the sidebar and the main view share one query, so a refresh in either updates both
export function useDevboxChanges(
  instanceId: Nullable<string>,
  live: boolean,
  { poll = false }: { poll?: boolean } = {}
) {
  const { data, previousData, error, loading, refetch } = useDevboxChangesQuery(
    {
      variables: { instanceId: instanceId ?? '', includeDiff: true },
      skip: !instanceId || !live,
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
      pollInterval: poll ? POLL_INTERVAL : 0,
      notifyOnNetworkStatusChange: true,
    }
  )
  const current = data ?? previousData
  const groups = useMemo(
    () =>
      current
        ? toChangeGroups(current).filter((g) => g.files.length)
        : undefined,
    [current]
  )
  return { groups, error, loading, refetch }
}

export function findChange(
  groups: Nullable<DevboxChangeGroup[]>,
  key: string
): Nullable<{ group: DevboxChangeGroup; file: DevboxChangedFile }> {
  for (const group of groups ?? [])
    for (const file of group.files)
      if (changeKey(group, file) === key) return { group, file }
  return null
}

export type ChangeTreeNode =
  | {
      kind: 'dir'
      id: string
      name: string
      children: ChangeTreeNode[]
      repository?: DevboxChangeGroup
    }
  | { kind: 'file'; id: string; name: string; file: DevboxChangedFile }

// repositories (when more than one changed), then directories, with single-directory
// chains folded into one row as in `monolith / src`
export function buildChangeTree(groups: DevboxChangeGroup[]): ChangeTreeNode[] {
  const repoTrees = groups.map((group) => {
    const root: ChangeTreeNode & { kind: 'dir' } = {
      kind: 'dir',
      id: `repo:${group.path ?? group.repository}`,
      name: group.repository,
      children: [],
      repository: group,
    }
    for (const file of group.files) {
      const parts = file.path.split('/')
      let dir = root
      for (const [i, part] of parts.slice(0, -1).entries()) {
        const id = `${root.id}/${parts.slice(0, i + 1).join('/')}`
        let next = dir.children.find(
          (c): c is ChangeTreeNode & { kind: 'dir' } =>
            c.kind === 'dir' && c.id === id
        )
        if (!next) {
          next = { kind: 'dir', id, name: part, children: [] }
          dir.children.push(next)
        }
        dir = next
      }
      dir.children.push({
        kind: 'file',
        id: changeKey(group, file),
        name: parts.at(-1) ?? file.path,
        file,
      })
    }
    return { ...root, children: root.children.map(fold).sort(byKind) }
  })
  return repoTrees.length === 1 ? repoTrees[0].children : repoTrees
}

function fold(node: ChangeTreeNode): ChangeTreeNode {
  if (node.kind === 'file') return node
  let dir = node
  while (dir.children.length === 1 && dir.children[0].kind === 'dir') {
    const [only] = dir.children
    dir = { ...only, name: `${dir.name} / ${only.name}` }
  }
  return { ...dir, children: dir.children.map(fold).sort(byKind) }
}

const byKind = (a: ChangeTreeNode, b: ChangeTreeNode) =>
  Number(b.kind === 'dir') - Number(a.kind === 'dir') ||
  a.name.localeCompare(b.name)

// directory rows the tree starts expanded with
export function changeTreeDirIds(nodes: ChangeTreeNode[]): string[] {
  return nodes.flatMap((n) =>
    n.kind === 'dir' ? [n.id, ...changeTreeDirIds(n.children)] : []
  )
}

export const CHANGE_STATUS_LETTERS: Record<string, string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  copied: 'C',
  untracked: 'U',
  conflicted: '!',
  type_changed: 'T',
}
