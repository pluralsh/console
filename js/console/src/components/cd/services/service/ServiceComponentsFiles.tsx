import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { TreeItem } from '@mui/x-tree-view/TreeItem'
import { Code, EmptyState, FolderIcon, Tooltip } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  FileTypeIcon,
  fileTreeMuiTheme,
  StyledTreeView,
  TreeItemIcon,
  TreeItemText,
} from 'components/utils/fileTree'
import { StackedText } from 'components/utils/table/StackedText'
import { ServiceFile, useServiceTarballQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import { getLanguageFromFileName } from 'utils/file'
import {
  useSetServiceComponentsChatButtonVisible,
  useSetServiceComponentsFiltersHidden,
  useSetServiceComponentsHeadingContent,
} from './ServiceComponentsContext'
import {
  useServiceContext,
  useSetSidenavContent,
} from './ServiceDetailsContext'

function decodeBase64(content: string): string {
  try {
    const binary = atob(content)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return content
  }
}

type TreeNode = {
  id: string
  name: string
  path: string
  isFile: boolean
  content?: string
  children: TreeNode[]
}

type TreeNodeBuilder = Omit<TreeNode, 'children'> & {
  children: Record<string, TreeNodeBuilder>
}

function buildTree(contentMap: Map<string, string>): TreeNode[] {
  const root: Record<string, TreeNodeBuilder> = {}

  for (const path of contentMap.keys()) {
    const parts = path.split('/')
    let currentLevel: Record<string, TreeNodeBuilder> = root
    let currentPath = ''

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1
      currentPath = currentPath ? `${currentPath}/${part}` : part

      if (!currentLevel[part]) {
        currentLevel[part] = {
          id: currentPath,
          name: part,
          path: currentPath,
          isFile,
          content: isFile ? contentMap.get(currentPath) : undefined,
          children: {},
        }
      }

      if (!isFile) {
        currentLevel = currentLevel[part].children
      }
    })
  }

  // Convert to array structure and collapse single-child folders.
  const convertAndCollapse = (
    obj: Record<string, TreeNodeBuilder>
  ): TreeNode[] => {
    return Object.values(obj).map((node) => {
      if (node.isFile) return { ...node, children: [] }

      // Recursively process children.
      const processedChildren = convertAndCollapse(node.children)

      // Collapse if this folder has only one child that is also a folder.
      if (processedChildren.length === 1 && !processedChildren[0].isFile) {
        const child = processedChildren[0]
        return { ...child, name: `${node.name}/${child.name}`, id: node.id }
      }

      return { ...node, children: processedChildren }
    })
  }

  return convertAndCollapse(root)
}

// Build a lookup map for efficient node access.
function buildNodeLookup(
  nodes: TreeNode[],
  parentMap: Map<string, string | undefined> = new Map(),
  nodeMap: Map<string, TreeNode> = new Map()
): {
  nodeMap: Map<string, TreeNode>
  parentMap: Map<string, string | undefined>
} {
  nodes.forEach((node) => {
    nodeMap.set(node.id, node)
    if (node.children.length > 0) {
      node.children.forEach((child) => {
        parentMap.set(child.id, node.id)
      })
      buildNodeLookup(node.children, parentMap, nodeMap)
    }
  })
  return { nodeMap, parentMap }
}

export function ComponentsFilesView() {
  const { service, isLoading: serviceLoading } = useServiceContext()
  const [selectedFile, setSelectedFile] = useState<ServiceFile>()
  const [parentOfSelectedId, setParentOfSelectedId] = useState<string>()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const { data, loading, error } = useServiceTarballQuery({
    variables: { id: service?.id ?? '' },
    skip: !service?.id,
  })

  const treeNodes = useMemo(() => {
    const files = data?.serviceTarball ?? []
    const contentMap = files.reduce((acc, file) => {
      if (file?.path && file?.content) {
        acc.set(file.path, decodeBase64(file.content))
      }
      return acc
    }, new Map<string, string>())

    if (contentMap.size === 0) {
      return []
    }

    return buildTree(contentMap)
  }, [data])

  const { nodeMap, parentMap } = useMemo(() => {
    if (treeNodes.length === 0) {
      return {
        nodeMap: new Map<string, TreeNode>(),
        parentMap: new Map<string, string | undefined>(),
      }
    }
    return buildNodeLookup(treeNodes)
  }, [treeNodes])

  const selectFile = (file: ServiceFile, parentId?: string) => {
    setSelectedFile(file)
    setParentOfSelectedId(parentId)
    if (!parentId) return

    // Auto-expand parent directories of the selected file
    const requiredExpanded: string[] = []
    let currentParentId: string | undefined = parentId

    while (currentParentId) {
      requiredExpanded.push(currentParentId)
      currentParentId = parentMap.get(currentParentId)
    }

    setExpandedItems((prev) =>
      Array.from(new Set([...prev, ...requiredExpanded]))
    )
  }

  // Auto-select first file when data is loaded
  const [hasAutoSelected, setHasAutoSelected] = useState(false)
  if (
    !isEmpty(data?.serviceTarball) &&
    !hasAutoSelected &&
    !selectedFile?.path
  ) {
    const firstFile = data?.serviceTarball?.find((f) => f?.path && f?.content)
    if (firstFile?.path && firstFile?.content) {
      setHasAutoSelected(true)
      selectFile(
        { path: firstFile.path, content: decodeBase64(firstFile.content) },
        parentMap.get(firstFile.path)
      )
    }
  }

  const handleItemSelection = (
    _event: unknown,
    itemId: string,
    isSelected: boolean
  ) => {
    if (!isSelected) return
    const node = nodeMap.get(itemId)
    if (node?.isFile && node.content) {
      selectFile(
        { path: node.path, content: node.content },
        parentMap.get(itemId)
      )
    }
  }

  const sidenavContent = useMemo(() => {
    const renderTree = (nodes: TreeNode[]) =>
      nodes.map((node) => {
        const isParentOfSelected =
          !node.isFile && node.id === parentOfSelectedId
        const isSelectedFile = node.isFile && node.id === selectedFile?.path

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
                <div
                  css={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  <TreeItemIcon>
                    {node.isFile ? (
                      <FileTypeIcon fileName={node.name} />
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
      <MuiThemeProvider theme={fileTreeMuiTheme}>
        <StyledTreeView
          itemChildrenIndentation={12}
          selectedItems={selectedFile?.path ? [selectedFile.path] : []}
          expandedItems={expandedItems}
          onExpandedItemsChange={(_event, itemIds) => setExpandedItems(itemIds)}
          onItemSelectionToggle={handleItemSelection}
        >
          {renderTree(treeNodes)}
        </StyledTreeView>
      </MuiThemeProvider>
    ) : undefined
  }, [
    data,
    treeNodes,
    parentOfSelectedId,
    selectedFile,
    handleItemSelection,
    expandedItems,
  ])

  const heading = useMemo(
    () => (
      <StackedText
        loading={serviceLoading}
        first={service?.name}
        firstColor="text"
        firstPartialType="body1Bold"
        second={`ID: ${service?.id}`}
        secondPartialType="caption"
      />
    ),
    [service, serviceLoading]
  )

  useSetSidenavContent(sidenavContent)
  useSetServiceComponentsHeadingContent(heading)
  useSetServiceComponentsFiltersHidden(true)
  useSetServiceComponentsChatButtonVisible(true)

  if (error) return <GqlError error={error} />
  if (serviceLoading || (!data && loading))
    return (
      <RectangleSkeleton
        $height="100%"
        $width="100%"
      />
    )

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
