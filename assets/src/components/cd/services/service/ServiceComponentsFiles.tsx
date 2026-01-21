import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useServiceTarballQuery } from 'generated/graphql'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
} from 'react-complex-tree'
import 'react-complex-tree/lib/style.css'
import type { TreeItem as TreeItemType } from 'react-complex-tree'
import styled from 'styled-components'
import { useSetSidenavContent } from './ServiceDetails'
import { Code } from '@pluralsh/design-system'

const DarkTreeWrapper = styled.div`
  --rct-color-tree-bg: transparent;
  --rct-color-tree-focus-outline: transparent;
  --rct-color-focustree-item-selected-bg: #373737;
  --rct-color-focustree-item-selected-text: #ffffff;
  --rct-color-focustree-item-focused-border: #1d7be5;
  --rct-color-focustree-item-draggingover-bg: #313131;
  --rct-color-focustree-item-draggingover-color: #ffffff;
  --rct-color-nonfocustree-item-selected-bg: #373737;
  --rct-color-nonfocustree-item-selected-text: #ffffff;
  --rct-color-nonfocustree-item-focused-border: #4f4f4f;
  --rct-color-search-highlight-bg: #2f5381;
  --rct-color-drag-between-line-bg: #1d7be5;
  --rct-color-arrow: #ffffff;

  height: 100%;
  width: 100%;
`

type TreeNode = {
  id: string
  name: string
  path: string
  isFile: boolean
  content?: string
  children: TreeNode[]
}

function buildTree(
  paths: string[],
  contentMap: Record<string, string>
): TreeNode[] {
  const root: Record<string, TreeNode> = {}

  paths.forEach((path) => {
    const parts = path.split('/')
    let currentLevel: Record<string, TreeNode> = root

    parts.forEach((part, index) => {
      const currentPath = parts.slice(0, index + 1).join('/')
      const isFile = index === parts.length - 1

      if (!currentLevel[part]) {
        currentLevel[part] = {
          id: currentPath,
          name: part,
          path: currentPath,
          isFile,
          content: isFile ? contentMap[currentPath] : undefined,
          children: [] as any,
        }
      }

      if (!isFile) {
        currentLevel = currentLevel[part].children as any
      }
    })
  })

  // Convert nested object structure to array-based tree and collapse single-child folders
  const objectToArray = (obj: Record<string, TreeNode>): TreeNode[] =>
    Object.values(obj).map((node) => ({
      ...node,
      children: node.isFile ? [] : objectToArray(node.children as any),
    }))

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

function convertToTreeItems(nodes: TreeNode[]): Record<string, TreeItemType> {
  const items: Record<string, TreeItemType> = {
    root: {
      index: 'root',
      isFolder: true,
      children: nodes.map((n) => n.id),
      data: { name: 'Root' },
    },
  }

  const addNode = (node: TreeNode) => {
    items[node.id] = {
      index: node.id,
      isFolder: !node.isFile,
      children: node.children.map((c) => c.id),
      data: { name: node.name, path: node.path, content: node.content },
    }
    node.children.forEach(addNode)
  }

  nodes.forEach(addNode)

  return items
}

export function ComponentsFilesView() {
  const { serviceId } = useParams<{ serviceId: string }>()
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const { data, loading, error } = useServiceTarballQuery({
    variables: { id: serviceId! },
    skip: !serviceId,
  })

  const treeItems = useMemo(() => {
    const files = data?.serviceTarball ?? []
    const paths = files.map((file) => file?.path).filter(Boolean) as string[]
    const contentMap = files.reduce(
      (acc, file) => {
        if (file?.path && file?.content) {
          acc[file.path] = file.content
        }
        return acc
      },
      {} as Record<string, string>
    )

    if (!paths?.length) {
      return {
        root: {
          index: 'root',
          isFolder: true,
          children: [],
          data: { name: 'Root' },
        },
      }
    }

    return convertToTreeItems(buildTree(paths, contentMap))
  }, [data])

  const sidenavContent = useMemo(
    () =>
      !loading && !error ? (
        <DarkTreeWrapper>
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
            onSelectItems={(items) => {
              const itemId = items[0]
              if (itemId && treeItems[itemId]?.data?.content) {
                setSelectedFile(treeItems[itemId].data.content)
              }
            }}
          >
            <Tree
              treeId="file-tree"
              rootItem="root"
              treeLabel="Files"
            />
          </UncontrolledTreeEnvironment>
        </DarkTreeWrapper>
      ) : undefined,
    [loading, error, treeItems]
  )

  useSetSidenavContent(sidenavContent)

  if (error) return <GqlError error={error} />

  if (loading) return <LoadingIndicator />

  return selectedFile ? (
    <Code
      language="yaml"
      maxHeight="100%"
      overflowY="auto"
    >
      {selectedFile}
    </Code>
  ) : (
    <p>Select a file from the tree on the left to view its contents.</p>
  )
}
