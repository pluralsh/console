import { describe, expect, it } from 'vitest'

import {
  buildChangeTree,
  ChangeTreeNode,
  changeTreeDirIds,
  findChange,
} from './devboxChanges'
import { DevboxChangeGroup } from './devboxWorkspaceApi'

const group = (repository: string, paths: string[]): DevboxChangeGroup => ({
  repository,
  path: `/home/dev/${repository}`,
  files: paths.map((path) => ({ path, status: 'modified', additions: 1 })),
})

// name and children, for readable assertions
const shape = (nodes: ChangeTreeNode[]): unknown[] =>
  nodes.map((n) =>
    n.kind === 'file' ? n.name : { [n.name]: shape(n.children) }
  )

describe('buildChangeTree', () => {
  it('folds single-directory chains and lists directories before files', () => {
    const tree = buildChangeTree([
      group('console', [
        'docs/webhooks.mdx',
        'monolith/src/lib/rate-limit.ts',
        'monolith/src/lib/rate-limit.test.ts',
        'monolith/src/routes/webhooks.ts',
        'README.md',
      ]),
    ])
    expect(shape(tree)).toEqual([
      { docs: ['webhooks.mdx'] },
      {
        'monolith / src': [
          { lib: ['rate-limit.test.ts', 'rate-limit.ts'] },
          { routes: ['webhooks.ts'] },
        ],
      },
      'README.md',
    ])
    const file = tree.at(-1)
    expect(file?.id).toBe('/home/dev/console/README.md')
  })

  it('groups by repository once more than one has changes', () => {
    const groups = [group('api', ['a.go']), group('web', ['src/b.ts'])]
    const tree = buildChangeTree(groups)
    expect(shape(tree)).toEqual([
      { api: ['a.go'] },
      { web: [{ src: ['b.ts'] }] },
    ])
    expect(changeTreeDirIds(tree)).toHaveLength(3)
    expect(findChange(groups, '/home/dev/web/src/b.ts')?.file.path).toBe(
      'src/b.ts'
    )
    expect(findChange(groups, '/home/dev/web/missing.ts')).toBeNull()
  })
})
