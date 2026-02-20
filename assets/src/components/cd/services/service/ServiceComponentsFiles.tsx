import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView'
import { TreeItem, treeItemClasses } from '@mui/x-tree-view/TreeItem'
import { Code, EmptyState, FolderIcon, Tooltip } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import { TRUNCATE_LEFT } from 'components/utils/truncate'
import { ServiceFile, useServiceTarballQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { getExtensionFromFileName, getLanguageFromFileName } from 'utils/file'
import {
  useSetServiceComponentsChatButtonVisible,
  useSetServiceComponentsFiltersHidden,
  useSetServiceComponentsHeadingContent,
} from './ServiceComponentsContext'
import {
  useServiceContext,
  useSetSidenavContent,
} from './ServiceDetailsContext'

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
      backgroundColor: theme.colors['fill-zero-hover'],
    },

    '&.Mui-focused, &.Mui-selected, &.Mui-selected.Mui-focused': {
      backgroundColor: theme.colors['fill-zero-selected'],
      color: theme.colors.text,
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
    paddingLeft:
      'calc(var(--TreeView-itemChildrenIndentation)) - max(0px, (var(--TreeView-itemDepth) - 2) * 12px))',
    borderLeft: `1px solid ${theme.colors['border']}`,
    margin: `2px 0 2px 14px`,
  },

  [`& .${treeItemClasses.root}.parent-of-selected > .${treeItemClasses.groupTransition}:has(.${treeItemClasses.root}.file-selected)`]:
    {
      borderLeftColor: theme.colors.grey[600],
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
  ...TRUNCATE_LEFT,
  minWidth: 0,
})

const FILE_TYPE_ICON_PATH = '/file-type-icons' as const
const FILE_ICON_SIZE = 18

const FILE_TYPE_ICONS: Readonly<Record<string, string>> = {
  dockerfile: `${FILE_TYPE_ICON_PATH}/file_type_docker.svg`,
  helmignore: `${FILE_TYPE_ICON_PATH}/file_type_helm.svg`,
  json: `${FILE_TYPE_ICON_PATH}/file_type_json.svg`,
  yaml: `${FILE_TYPE_ICON_PATH}/file_type_light_yaml.svg`,
  yml: `${FILE_TYPE_ICON_PATH}/file_type_yaml.svg`,
  md: `${FILE_TYPE_ICON_PATH}/file_type_markdown.svg`,
  markdown: `${FILE_TYPE_ICON_PATH}/file_type_markdown.svg`,
  license: `${FILE_TYPE_ICON_PATH}/file_type_license.svg`,
  liquid: `${FILE_TYPE_ICON_PATH}/file_type_liquid.svg`,
  lua: `${FILE_TYPE_ICON_PATH}/file_type_lua.svg`,
  toml: `${FILE_TYPE_ICON_PATH}/file_type_light_toml.svg`,
  tpl: `${FILE_TYPE_ICON_PATH}/file_type_templ.svg`,
  tpl_: `${FILE_TYPE_ICON_PATH}/file_type_templ.svg`,
  txt: `${FILE_TYPE_ICON_PATH}/file_type_text.svg`,
} as const

function FileTreeItemIcon({ fileName }: { fileName: string }): React.ReactNode {
  const extension = getExtensionFromFileName(fileName)
  const iconPath = extension
    ? FILE_TYPE_ICONS[extension.toLowerCase()]
    : undefined

  if (iconPath) {
    return (
      <img
        src={iconPath}
        alt={extension}
        width={FILE_ICON_SIZE}
        height={FILE_ICON_SIZE}
      />
    )
  }

  return <FileTreeItemTextIcon extension={extension ?? ''} />
}

function FileTreeItemTextIcon({
  extension,
}: {
  extension: string
}): React.ReactNode {
  const theme = useTheme()

  return (
    <div
      css={{
        width: FILE_ICON_SIZE,
        height: FILE_ICON_SIZE,
        color: theme.colors['text-success'],
        fontFamily: 'Inter',
        fontWeight: 600,
        fontSize: 9,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {extension.toLowerCase().slice(0, 3)}
    </div>
  )
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
  const hasAutoSelectedRef = useRef(false)

  const { data, loading, error } = useServiceTarballQuery({
    variables: { id: service?.id ?? '' },
    skip: !service?.id,
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

  const { nodeMap, parentMap } = useMemo(() => {
    if (treeNodes.length === 0) {
      return {
        nodeMap: new Map<string, TreeNode>(),
        parentMap: new Map<string, string | undefined>(),
      }
    }
    return buildNodeLookup(treeNodes)
  }, [treeNodes])

  // Auto-select first file when data is loaded
  useEffect(() => {
    if (
      !isEmpty(data?.serviceTarball) &&
      !hasAutoSelectedRef.current &&
      !selectedFile?.path
    ) {
      const firstFile = data?.serviceTarball?.find((f) => f?.path && f?.content)
      if (firstFile?.path && firstFile?.content) {
        const parentId = parentMap.get(firstFile.path)
        setSelectedFile({ path: firstFile.path, content: firstFile.content })
        setParentOfSelectedId(parentId)
        hasAutoSelectedRef.current = true
      }
    }
  }, [data?.serviceTarball, treeNodes, parentMap, selectedFile?.path])

  // Auto-expand parent directories when a file is selected
  useEffect(() => {
    if (selectedFile?.path && parentOfSelectedId) {
      const requiredExpanded: string[] = []
      let currentParentId: string | undefined = parentOfSelectedId

      while (currentParentId) {
        requiredExpanded.push(currentParentId)
        currentParentId = parentMap.get(currentParentId)
      }

      setExpandedItems((prev) => {
        const merged = new Set([...prev, ...requiredExpanded])
        return Array.from(merged)
      })
    }
  }, [selectedFile?.path, parentOfSelectedId, parentMap])

  const handleItemSelection = useCallback(
    (_event: unknown, itemId: string, isSelected: boolean) => {
      if (isSelected) {
        const node = nodeMap.get(itemId)
        if (node?.isFile && node.content) {
          setSelectedFile({ path: node.path, content: node.content })
          setParentOfSelectedId(parentMap.get(itemId))
        }
      }
    },
    [nodeMap, parentMap]
  )

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
                      <FileTreeItemIcon fileName={node.name} />
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
        selectedItems={selectedFile?.path ? [selectedFile.path] : []}
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
