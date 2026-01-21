import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { ServiceFile, useServiceTarballQuery } from 'generated/graphql'
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
import { getLanguageFromFileName } from 'utils/file'

const DarkTreeWrapper = styled.div(({ theme }) => ({
  '--rct-color-tree-bg': 'transparent',
  '--rct-color-tree-focus-outline': 'transparent',
  '--rct-color-focustree-item-selected-bg': theme.colors['fill-one-hover'],
  '--rct-color-focustree-item-selected-text': theme.colors.text,
  '--rct-color-focustree-item-focused-border': 'transparent',
  '--rct-color-focustree-item-draggingover-bg':
    theme.colors['fill-one-selected'],
  '--rct-color-focustree-item-draggingover-color': theme.colors.text,
  '--rct-color-nonfocustree-item-selected-bg': theme.colors['fill-one-hover'],
  '--rct-color-nonfocustree-item-selected-text': theme.colors.text,
  '--rct-color-nonfocustree-item-focused-border': 'transparent',
  '--rct-color-search-highlight-bg': theme.colors['action-primary'],
  '--rct-color-arrow': theme.colors['icon-default'],
  height: '100%',
  width: '100%',

  '.rct-tree-item-title-container': {
    borderRadius: theme.borderRadiuses.medium,

    '&:hover': {
      backgroundColor: theme.colors['fill-one-hover'],
    },

    '.rct-tree-item-button': {
      ...theme.partials.text.body2,
      color: theme.colors['text-light'],
      padding: `${theme.spacing.medium}px ${theme.spacing.small}px`,

      '&.rct-tree-item-button-focused': {
        color: theme.colors['text'],
      },
    },
  },
}))

type TreeNode = {
  id: string
  name: string
  path: string
  isFile: boolean
  content?: string
  children: TreeNode[]
}

function buildTree(contentMap: Record<string, string>): TreeNode[] {
  const root: Record<string, TreeNode> = {}
  const paths = Object.keys(contentMap)

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
  const [selectedFile, setSelectedFile] = useState<ServiceFile | null>(null)

  const { data, loading, error } = useServiceTarballQuery({
    variables: { id: serviceId! },
    skip: !serviceId,
  })

  const treeItems = useMemo(() => {
    const files = data?.serviceTarball ?? []
    const contentMap = files.reduce(
      (acc, file) => {
        if (file?.path && file?.content) {
          acc[file.path] = file.content
        }
        return acc
      },
      {} as Record<string, string>
    )

    if (Object.keys(contentMap).length === 0) {
      return {
        root: {
          index: 'root',
          isFolder: true,
          children: [],
          data: { name: 'Root' },
        },
      }
    }

    return convertToTreeItems(buildTree(contentMap))
  }, [data])

  const sidenavContent = useMemo(
    () =>
      data?.serviceTarball ? (
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
                setSelectedFile({
                  path: treeItems[itemId].data.path,
                  content: treeItems[itemId].data.content,
                })
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
    [data, treeItems]
  )

  useSetSidenavContent(sidenavContent)

  if (error) return <GqlError error={error} />

  if (loading) return <LoadingIndicator />

  return selectedFile ? (
    <Code
      height="100%"
      language={getLanguageFromFileName(selectedFile.path)}
      preserveTitleCase
      showHeader
      showLineNumbers
      title={selectedFile.path}
    >
      {selectedFile.content}
    </Code>
  ) : (
    <p>Select a file from the tree on the left to view its contents.</p>
  )
}
