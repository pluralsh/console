import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { ServiceFile, useServiceTarballQuery } from 'generated/graphql'
import { useMemo, useState } from 'react'
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView'
import { TreeItem, treeItemClasses } from '@mui/x-tree-view/TreeItem'
import styled, { useTheme } from 'styled-components'
import {
  useServiceContext,
  useSetSidenavContent,
} from './ServiceDetailsContext'
import { Code, FileIcon, Flex, FolderIcon } from '@pluralsh/design-system'
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
    borderLeft: `1px solid ${theme.colors['border-fill-two']}`,
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

export function ComponentsFilesView() {
  const theme = useTheme()
  const { service } = useServiceContext()
  const [selectedFile, setSelectedFile] = useState<ServiceFile>()

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

  const sidenavContent = useMemo(() => {
    // Recursive function to render tree items (defined inside useMemo)
    const renderTree = (nodes: TreeNode[]): React.ReactNode =>
      nodes.map((node) => (
        <TreeItem
          key={node.id}
          itemId={node.id}
          label={
            <>
              <TreeItemIcon>
                {node.isFile ? (
                  <FileIcon size={14} />
                ) : (
                  <FolderIcon size={14} />
                )}
              </TreeItemIcon>
              <TreeItemText>{node.name}</TreeItemText>
            </>
          }
        >
          {!node.isFile &&
            node.children.length > 0 &&
            renderTree(node.children)}
        </TreeItem>
      ))

    return data?.serviceTarball && treeNodes.length > 0 ? (
      <StyledTreeView
        itemChildrenIndentation={12}
        onItemSelectionToggle={(_event, itemId, isSelected) => {
          if (isSelected) {
            // Find the node in the tree
            const findNode = (
              nodes: TreeNode[],
              id: string
            ): TreeNode | undefined => {
              for (const node of nodes) {
                if (node.id === id) return node
                if (node.children.length > 0) {
                  const found = findNode(node.children, id)
                  if (found) return found
                }
              }
              return undefined
            }

            const node = findNode(treeNodes, itemId)
            if (node?.isFile && node.content) {
              setSelectedFile({
                path: node.path,
                content: node.content,
              })
            }
          }
        }}
      >
        {renderTree(treeNodes)}
      </StyledTreeView>
    ) : undefined
  }, [data, treeNodes])

  const heading = useMemo(
    () => (
      <Flex flexDirection="column">
        <Body1BoldP>{service.name}</Body1BoldP>
        <CaptionP css={{ color: theme.colors['text-xlight'] }}>
          ID: {service.id}
        </CaptionP>
      </Flex>
    ),
    [service.name, service.id, theme.colors]
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
    <p>Select a file from the tree on the left to view its contents.</p>
  )
}
