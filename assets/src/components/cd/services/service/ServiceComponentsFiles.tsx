import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { ServiceFile, useServiceTarballQuery } from 'generated/graphql'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView'
import { TreeItem, treeItemClasses } from '@mui/x-tree-view/TreeItem'
import styled, { useTheme } from 'styled-components'
import {
  useServiceContext,
  useSetSidenavContent,
} from './ServiceDetailsContext'
import {
  Code,
  EmptyState,
  FileIcon,
  Flex,
  FolderIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { getLanguageFromFileName } from 'utils/file'
import {
  useSetServiceComponentsChatButtonVisible,
  useSetServiceComponentsFiltersHidden,
  useSetServiceComponentsHeadingContent,
} from './ServiceComponentsContext'
import { Body1BoldP, CaptionP } from 'components/utils/typography/Text'

const StyledTreeView = styled(SimpleTreeView)(({ theme }) => ({
  height: '100%',
  width: '100%',

  [`& .${treeItemClasses.root}`]: {
    marginBottom: theme.spacing.xxxsmall,
    width: '100%',
    paddingLeft: 2,
  },

  [`& .${treeItemClasses.content}`]: {
    borderRadius: theme.borderRadiuses.medium,
    padding: `${theme.spacing.xxsmall}px ${theme.spacing.xsmall}px`,
    ...theme.partials.text.body2,
    color: theme.colors['text-light'],
    width: '100%',
    minWidth: 0,
    display: 'flex',
    overflow: 'hidden',

    '&:hover': {
      backgroundColor: theme.colors['fill-one-hover'],
    },

    '&.Mui-focused, &.Mui-selected, &.Mui-selected.Mui-focused': {
      backgroundColor: theme.colors['fill-one-selected'],
      color: theme.colors.text,
    },
  },

  [`& .${treeItemClasses.iconContainer}`]: {
    width: '14px',
    minWidth: '14px',
    flexShrink: 0,

    '& svg': {
      fontSize: '14px',
    },
  },

  [`& .${treeItemClasses.label}`]: {
    display: 'flex',
    alignItems: 'center',
    padding: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },

  [`& .${treeItemClasses.groupTransition}`]: {
    marginLeft: '14px',
    paddingLeft:
      'calc(var(--TreeView-itemChildrenIndentation) * var(--TreeView-itemDepth))',
    borderLeft: `1px solid ${theme.colors['border']}`,
  },

  // Highlight only the direct parent's groupTransition border when it contains the selected file
  [`& .${treeItemClasses.root}.parent-of-selected > .${treeItemClasses.groupTransition}:has(.${treeItemClasses.root}.file-selected)`]:
    {
      borderLeftColor: theme.colors.grey[600],
    },

  // Ensure nested groupTransitions (sibling directories) are not highlighted
  [`& .${treeItemClasses.root}.parent-of-selected .${treeItemClasses.root}:not(.file-selected):not(.parent-of-selected) > .${treeItemClasses.groupTransition}`]:
    {
      borderLeftColor: theme.colors['border'],
    },
}))

const TreeItemIcon = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginRight: theme.spacing.xsmall,
  color: theme.colors['icon-default'],
  flexShrink: 0,
}))

const TreeItemText = styled.span({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  minWidth: 0,
  direction: 'rtl',
  textAlign: 'right',
})

type TreeNode = {
  id: string
  name: string
  path: string
  isFile: boolean
  content?: string
  children: TreeNode[]
}

function buildTree(contentMap: Map<string, string>): TreeNode[] {
  const root: Record<string, TreeNode> = {}
  const paths = Array.from(contentMap.keys())

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
          content: isFile ? contentMap.get(currentPath) : undefined,
          children: [],
        }
      }

      if (!isFile) {
        currentLevel = currentLevel[part].children as unknown as Record<
          string,
          TreeNode
        >
      }
    })
  })

  // Convert nested object structure to array-based tree and collapse single-child folders
  const objectToArray = (obj: Record<string, TreeNode>): TreeNode[] =>
    Object.values(obj).map((node) => ({
      ...node,
      children: node.isFile
        ? []
        : objectToArray(node.children as unknown as Record<string, TreeNode>),
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

function findNodeAndParent(
  nodes: TreeNode[],
  targetId: string,
  parentId: string | null = null
): { node: TreeNode | undefined; parentId: string | null } {
  for (const node of nodes) {
    if (node.id === targetId) {
      return { node, parentId }
    }

    if (node.children.length > 0) {
      const result = findNodeAndParent(node.children, targetId, node.id)
      if (result.node) {
        return result
      }
    }
  }

  return { node: undefined, parentId: null }
}

function findFirstFile(nodes: TreeNode[]): TreeNode | undefined {
  for (const node of nodes) {
    if (node.isFile) {
      return node
    }
    if (node.children.length > 0) {
      const found = findFirstFile(node.children)
      if (found) {
        return found
      }
    }
  }
  return undefined
}

export function ComponentsFilesView() {
  const theme = useTheme()
  const { service } = useServiceContext()
  const [selectedFile, setSelectedFile] = useState<ServiceFile>()
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [parentOfSelectedId, setParentOfSelectedId] = useState<string | null>(
    null
  )
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const hasAutoSelectedRef = useRef(false)

  const { data, loading, error } = useServiceTarballQuery({
    variables: { id: service.id! },
    skip: !service.id,
  })

  const treeNodes = useMemo(() => {
    const files = data?.serviceTarball ?? []
    const contentMap = files.reduce((acc, file) => {
      if (file?.path && file?.content) {
        acc.set(file.path, file.content)
      }
      return acc
    }, new Map<string, string>())

    if (contentMap.size === 0) {
      return []
    }

    return buildTree(contentMap)
  }, [data])

  // Auto-select first file when tree is loaded (only once)
  useEffect(() => {
    if (
      treeNodes.length > 0 &&
      !hasAutoSelectedRef.current &&
      !selectedFileId
    ) {
      const firstFile = findFirstFile(treeNodes)
      if (firstFile?.isFile && firstFile.content) {
        const { parentId } = findNodeAndParent(treeNodes, firstFile.id)
        setSelectedFile({
          path: firstFile.path,
          content: firstFile.content,
        })
        setSelectedFileId(firstFile.id)
        setParentOfSelectedId(parentId)
        hasAutoSelectedRef.current = true
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeNodes])

  // Auto-expand parent directories when a file is selected
  useEffect(() => {
    if (selectedFileId && parentOfSelectedId) {
      const requiredExpanded: string[] = []
      let currentParentId: string | null = parentOfSelectedId

      // Collect all ancestor parent IDs
      while (currentParentId) {
        requiredExpanded.push(currentParentId)
        const { parentId } = findNodeAndParent(treeNodes, currentParentId)
        currentParentId = parentId
      }

      // Merge with existing expanded items (preserve user-expanded items)
      setExpandedItems((prev) => {
        const merged = new Set([...prev, ...requiredExpanded])
        return Array.from(merged)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileId, parentOfSelectedId])

  const handleItemSelection = useCallback(
    (_event: unknown, itemId: string, isSelected: boolean) => {
      if (isSelected) {
        const { node, parentId } = findNodeAndParent(treeNodes, itemId)
        if (node?.isFile && node.content) {
          setSelectedFile({
            path: node.path,
            content: node.content,
          })
          setSelectedFileId(itemId)
          setParentOfSelectedId(parentId)
        }
      }
    },
    [treeNodes]
  )

  const sidenavContent = useMemo(() => {
    const renderTree = (nodes: TreeNode[]) =>
      nodes.map((node) => {
        const isParentOfSelected =
          !node.isFile && node.id === parentOfSelectedId
        const isSelectedFile = node.isFile && node.id === selectedFileId

        return (
          <TreeItem
            key={node.id}
            itemId={node.id}
            className={
              isParentOfSelected
                ? 'parent-of-selected'
                : isSelectedFile
                  ? 'file-selected'
                  : undefined
            }
            label={
              <Tooltip
                label={node.name}
                css={{ marginLeft: 6 }}
              >
                <div css={{ display: 'flex', flex: 1 }}>
                  <TreeItemIcon>
                    {node.isFile ? (
                      <FileIcon size={14} />
                    ) : (
                      <FolderIcon size={14} />
                    )}
                  </TreeItemIcon>
                  <TreeItemText>{node.name}</TreeItemText>
                </div>
              </Tooltip>
            }
          >
            {!node.isFile &&
              node.children.length > 0 &&
              renderTree(node.children)}
          </TreeItem>
        )
      })

    return data?.serviceTarball && treeNodes.length > 0 ? (
      <StyledTreeView
        itemChildrenIndentation={12}
        selectedItems={selectedFileId ? [selectedFileId] : []}
        expandedItems={expandedItems}
        onExpandedItemsChange={(_event, itemIds) => setExpandedItems(itemIds)}
        onItemSelectionToggle={handleItemSelection}
      >
        {renderTree(treeNodes)}
      </StyledTreeView>
    ) : undefined
  }, [
    data,
    treeNodes,
    parentOfSelectedId,
    selectedFileId,
    handleItemSelection,
    expandedItems,
  ])

  const headingSecondaryColor = theme.colors['text-xlight']
  const heading = useMemo(
    () => (
      <Flex flexDirection="column">
        <Body1BoldP>{service.name}</Body1BoldP>
        <CaptionP css={{ color: headingSecondaryColor }}>
          ID: {service.id}
        </CaptionP>
      </Flex>
    ),
    [service.name, service.id, headingSecondaryColor]
  )

  useSetSidenavContent(sidenavContent)
  useSetServiceComponentsHeadingContent(heading)
  useSetServiceComponentsFiltersHidden(true)
  useSetServiceComponentsChatButtonVisible(true)

  if (error) return <GqlError error={error} />

  if (loading) return <LoadingIndicator />

  return selectedFile ? (
    <Code
      height="100%"
      language={getLanguageFromFileName(selectedFile.path)}
      showHeader={false}
      showLineNumbers
      title={selectedFile.path}
    >
      {selectedFile.content}
    </Code>
  ) : (
    <EmptyState
      message="No files found"
      description="The service has no files."
    />
  )
}
