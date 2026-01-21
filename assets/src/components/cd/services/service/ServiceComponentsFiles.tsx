import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useServiceTarballQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
} from 'react-complex-tree'
import 'react-complex-tree/lib/style-modern.css'
import type { TreeItem as TreeItemType } from 'react-complex-tree'

type TreeNode = {
  id: string
  name: string
  path: string
  isFile: boolean
  children: TreeNode[]
}

function buildTree(paths: string[]): TreeNode[] {
  const root: Record<string, any> = {}

  paths.forEach((path) => {
    const parts = path.split('/')
    let currentLevel = root

    parts.forEach((part, index) => {
      const currentPath = parts.slice(0, index + 1).join('/')
      const isFile = index === parts.length - 1

      if (!currentLevel[part]) {
        currentLevel[part] = {
          id: currentPath,
          name: part,
          path: currentPath,
          isFile,
          children: {},
        }
      }

      if (!isFile) {
        currentLevel = currentLevel[part].children
      }
    })
  })

  // Convert nested object structure to array-based tree
  function objectToArray(obj: Record<string, any>): TreeNode[] {
    return Object.values(obj).map((node) => ({
      ...node,
      children: node.isFile ? [] : objectToArray(node.children),
    }))
  }

  // Convert the root object to an array and collapse single-child folders
  return collapseSingleChildFolders(objectToArray(root))
}

function collapseSingleChildFolders(nodes: TreeNode[]): TreeNode[] {
  return nodes.map((node) => {
    if (node.isFile) {
      return node
    }

    // Recursively process children first
    const processedChildren = collapseSingleChildFolders(node.children)

    // If this folder has only one child and that child is also a folder, collapse them
    if (processedChildren.length === 1 && !processedChildren[0].isFile) {
      const child = processedChildren[0]
      return {
        ...child,
        name: `${node.name}/${child.name}`,
        id: node.id, // Keep the original parent's id as the collapsed node id
      }
    }

    return {
      ...node,
      children: processedChildren,
    }
  })
}

function convertToTreeItems(
  nodes: TreeNode[]
): Record<string, TreeItemType<any>> {
  const items: Record<string, TreeItemType<any>> = {
    root: {
      index: 'root',
      isFolder: true,
      children: nodes.map((n) => n.id),
      data: { name: 'Root' },
    },
  }

  function addNode(node: TreeNode) {
    const itemChildren = node.children.map((c) => c.id)
    items[node.id] = {
      index: node.id,
      isFolder: !node.isFile,
      children: itemChildren,
      data: { name: node.name, path: node.path },
    }

    node.children.forEach(addNode)
  }

  nodes.forEach(addNode)

  return items
}

export function ComponentsFilesView() {
  const { serviceId } = useParams<{ serviceId: string }>()

  const { data, loading, error } = useServiceTarballQuery({
    variables: { id: serviceId! },
    skip: !serviceId,
  })

  const treeData = useMemo(() => {
    const paths = data?.serviceTarball
      ?.map((file) => file?.path)
      .filter(Boolean) as string[]
    if (!paths || paths.length === 0) return []
    return buildTree(paths)
  }, [data])

  const treeItems = useMemo(() => convertToTreeItems(treeData), [treeData])

  console.log('treeItems', treeItems)

  if (error) return <GqlError error={error} />

  if (loading) return <LoadingIndicator />

  return (
    <div
      className="rct-dark"
      style={{ height: '100%', width: '100%' }}
    >
      <UncontrolledTreeEnvironment
        dataProvider={
          new StaticTreeDataProvider(treeItems, (item, data) => ({
            ...item,
            data,
          }))
        }
        getItemTitle={(item) => item.data.name}
        viewState={{
          'file-tree': {
            expandedItems: [],
          },
        }}
        canDragAndDrop={false}
        canDropOnFolder={false}
        canReorderItems={false}
      >
        <Tree
          treeId="file-tree"
          rootItem="root"
          treeLabel="Files"
        />
      </UncontrolledTreeEnvironment>
    </div>
  )
}
