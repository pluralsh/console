import {
  createTheme,
  ThemeProvider as MuiThemeProvider,
} from '@mui/material/styles'
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView'
import { TreeItem, treeItemClasses } from '@mui/x-tree-view/TreeItem'
import { useQuery } from '@tanstack/react-query'
import { Code, FolderIcon, Tooltip } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'
import { TRUNCATE, TRUNCATE_LEFT } from 'components/utils/truncate'
import { parsePatch } from 'diff'
import { useCallback, useEffect, useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { getExtensionFromFileName } from 'utils/file'

type DiffFile = {
  path: string
  patch: string
  additions: number
  deletions: number
}

type TreeNode = {
  id: string
  name: string
  path: string
  file?: DiffFile
  children: TreeNode[]
}

type TreeNodeBuilder = Omit<TreeNode, 'children'> & {
  children: Record<string, TreeNodeBuilder>
}

const muiTheme = createTheme()
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

async function fetchPatch(patchUrl: string) {
  const { host, pathname, search } = new URL(patchUrl)
  const response = await fetch(`/__object_store/${host}${pathname}${search}`)

  if (!response.ok) {
    throw new Error(
      `Unable to fetch diff (${response.status} ${response.statusText})`
    )
  }

  return response.text()
}

function splitPatchFiles(content: string): DiffFile[] {
  const rawFiles = content
    .split(/(?=^diff --git )/gm)
    .map((file) => file.trim())
    .filter(Boolean)
  const parsedFiles = parsePatch(content)

  return parsedFiles.map((file, index) => {
    const patch = rawFiles[index] ?? ''

    return {
      path: patchFilePath(file.oldFileName, file.newFileName, index),
      patch,
      ...countChangedLines(patch),
    }
  })
}

function countChangedLines(
  patch: string
): Pick<DiffFile, 'additions' | 'deletions'> {
  return patch.split('\n').reduce(
    (acc, line) => {
      if (line.startsWith('+') && !line.startsWith('+++')) acc.additions += 1
      if (line.startsWith('-') && !line.startsWith('---')) acc.deletions += 1

      return acc
    },
    { additions: 0, deletions: 0 }
  )
}

function patchFilePath(
  oldFileName: string | undefined,
  newFileName: string | undefined,
  index: number
) {
  const name =
    newFileName && newFileName !== '/dev/null' ? newFileName : oldFileName

  return name?.replace(/^[ab]\//, '') ?? `file-${index + 1}.patch`
}

function buildTree(files: DiffFile[]): TreeNode[] {
  const root: Record<string, TreeNodeBuilder> = {}

  for (const file of files) {
    const parts = file.path.split('/')
    let level = root
    let path = ''

    parts.forEach((part, index) => {
      path = path ? `${path}/${part}` : part

      level[part] ??= {
        id: path,
        name: part,
        path,
        file: index === parts.length - 1 ? file : undefined,
        children: {},
      }

      if (index < parts.length - 1) {
        level = level[part].children
      }
    })
  }

  const convert = (nodes: Record<string, TreeNodeBuilder>): TreeNode[] =>
    Object.values(nodes).map((node) => {
      if (node.file) return { ...node, children: [] }

      const children = convert(node.children)

      if (children.length === 1 && !children[0].file) {
        const child = children[0]
        return { ...child, id: node.id, name: `${node.name}/${child.name}` }
      }

      return { ...node, children }
    })

  return convert(root)
}

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

export function AgentRunDiff({
  runId,
  patchUrl,
}: {
  runId: string
  patchUrl: string
}) {
  const {
    data: content,
    error,
    isLoading,
  } = useQuery({
    queryKey: ['agent-run-patch', runId],
    queryFn: () => fetchPatch(patchUrl),
    enabled: !!runId && !!patchUrl,
    staleTime: Infinity,
  })
  const files = useMemo(
    () => (content ? splitPatchFiles(content) : []),
    [content]
  )
  const totals = useMemo(
    () =>
      files.reduce(
        (acc, file) => ({
          additions: acc.additions + file.additions,
          deletions: acc.deletions + file.deletions,
        }),
        { additions: 0, deletions: 0 }
      ),
    [files]
  )
  const tree = useMemo(() => buildTree(files), [files])
  const [selectedPath, setSelectedPath] = useState<string>()
  const [parentOfSelectedId, setParentOfSelectedId] = useState<string>()
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const { nodeMap, parentMap } = useMemo(() => buildNodeLookup(tree), [tree])
  const selectedNode = selectedPath ? nodeMap.get(selectedPath) : undefined
  const selectedFile = selectedNode?.file ?? files[0]

  useEffect(() => {
    setSelectedPath(files[0]?.path)
    setParentOfSelectedId(
      files[0]?.path ? parentMap.get(files[0].path) : undefined
    )
  }, [files, parentMap])

  useEffect(() => {
    if (selectedPath && parentOfSelectedId) {
      const requiredExpanded: string[] = []
      let currentParentId: string | undefined = parentOfSelectedId

      while (currentParentId) {
        requiredExpanded.push(currentParentId)
        currentParentId = parentMap.get(currentParentId)
      }

      setExpandedItems((prev) =>
        Array.from(new Set([...prev, ...requiredExpanded]))
      )
    }
  }, [selectedPath, parentOfSelectedId, parentMap])

  const handleItemSelection = useCallback(
    (_event: unknown, itemId: string, isSelected: boolean) => {
      if (isSelected) {
        const node = nodeMap.get(itemId)

        if (node?.file) {
          setSelectedPath(node.path)
          setParentOfSelectedId(parentMap.get(itemId))
        }
      }
    },
    [nodeMap, parentMap]
  )

  if (isLoading && !content) {
    return (
      <DiffStateSC>
        <RectangleSkeleton
          $height={200}
          $width="100%"
        />
      </DiffStateSC>
    )
  }

  if (error) {
    return (
      <DiffStateSC>
        <GqlError
          header="Unable to load diff."
          error={error}
        />
      </DiffStateSC>
    )
  }

  if (!content?.trim()) {
    return (
      <DiffStateSC>
        <CaptionP $color="text-light">No diff content available.</CaptionP>
      </DiffStateSC>
    )
  }

  return (
    <DiffLayoutSC>
      <DiffTreeSC>
        <DiffTreeHeaderSC>
          <span>{files.length} files changed</span>
          <DiffLineStatsSC>
            <DiffDeletionsSC>-{totals.deletions}</DiffDeletionsSC>
            <DiffAdditionsSC>+{totals.additions}</DiffAdditionsSC>
          </DiffLineStatsSC>
        </DiffTreeHeaderSC>
        <DiffTreeContentSC>
          <MuiThemeProvider theme={muiTheme}>
            <StyledTreeView
              itemChildrenIndentation={12}
              selectedItems={selectedFile?.path ? [selectedFile.path] : []}
              expandedItems={expandedItems}
              onExpandedItemsChange={(_event, itemIds) =>
                setExpandedItems(itemIds)
              }
              onItemSelectionToggle={handleItemSelection}
            >
              {renderTree(tree, parentOfSelectedId, selectedFile?.path)}
            </StyledTreeView>
          </MuiThemeProvider>
        </DiffTreeContentSC>
      </DiffTreeSC>
      <DiffContentSC>
        {selectedFile && (
          <DiffPanelHeaderSC>
            <DiffFileHeaderInfoSC>
              <DiffFileIconSC>
                <FileTreeItemIcon
                  fileName={getFileNameFromPath(selectedFile.path)}
                />
              </DiffFileIconSC>
              <DiffFileTextSC>
                <DiffFileNameSC>
                  {getFileNameFromPath(selectedFile.path)}
                </DiffFileNameSC>
                <DiffFilePathSC>{selectedFile.path}</DiffFilePathSC>
              </DiffFileTextSC>
            </DiffFileHeaderInfoSC>
            <DiffLineStatsSC>
              <DiffDeletionsSC>-{selectedFile.deletions}</DiffDeletionsSC>
              <DiffAdditionsSC>+{selectedFile.additions}</DiffAdditionsSC>
            </DiffLineStatsSC>
          </DiffPanelHeaderSC>
        )}
        <DiffCodeSC>
          <Code
            language="diff"
            showHeader={false}
            showLineNumbers
            title={selectedFile?.path ?? 'patch.diff'}
          >
            {selectedFile?.patch ?? content}
          </Code>
        </DiffCodeSC>
      </DiffContentSC>
    </DiffLayoutSC>
  )
}

function getFileNameFromPath(path: string) {
  const parts = path.split('/')

  return parts[parts.length - 1] ?? path
}

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

function renderTree(
  nodes: TreeNode[],
  parentOfSelectedId: string | undefined,
  selectedPath: string | undefined
) {
  return nodes.map((node) => {
    const isParentOfSelected = !node.file && node.id === parentOfSelectedId
    const isSelectedFile = node.file && node.id === selectedPath

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
            <TreeLabelSC>
              <TreeIconSC>
                {node.file ? (
                  <FileTreeItemIcon fileName={node.name} />
                ) : (
                  <FolderIcon size={14} />
                )}
              </TreeIconSC>
              <TreeTextSC>{node.name}</TreeTextSC>
            </TreeLabelSC>
          </Tooltip>
        }
      >
        {!node.file &&
          node.children.length > 0 &&
          renderTree(node.children, parentOfSelectedId, selectedPath)}
      </TreeItem>
    )
  })
}

const DiffLayoutSC = styled.div({
  display: 'flex',
  minHeight: 0,
  height: '100%',
  width: '100%',
})

const DiffTreeSC = styled.div(({ theme }) => ({
  width: 220,
  flexShrink: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  borderRight: theme.borders.default,
}))

const DIFF_PANEL_HEADER_HEIGHT = 56

const DiffPanelHeaderSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-one'],
  borderBottom: theme.borders['fill-one'],
  boxSizing: 'border-box',
  flexShrink: 0,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing.small,
  height: DIFF_PANEL_HEADER_HEIGHT,
  minHeight: DIFF_PANEL_HEADER_HEIGHT,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
  width: '100%',
}))

const DiffTreeHeaderSC = styled(DiffPanelHeaderSC)(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
  lineHeight: 1,
}))

const DiffFileHeaderInfoSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  flex: 1,
  minWidth: 0,
}))

const DiffFileIconSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
})

const DiffFileTextSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxxsmall,
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
}))

const DiffFileNameSC = styled.div(({ theme }) => ({
  fontFamily: '"Roboto Mono", monospace',
  fontSize: 14,
  lineHeight: '20px',
  color: theme.colors['text-light'],
  ...TRUNCATE,
}))

const DiffFilePathSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  ...TRUNCATE,
}))

const DiffLineStatsSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'inline-flex',
  gap: theme.spacing.xsmall,
  flexShrink: 0,
  letterSpacing: 0,
  textTransform: 'none',
}))

const DiffDeletionsSC = styled.span(({ theme }) => ({
  color: theme.colors['text-danger'],
}))

const DiffAdditionsSC = styled.span(({ theme }) => ({
  color: theme.colors['text-success'],
}))

const DiffTreeContentSC = styled.div(({ theme }) => ({
  minHeight: 0,
  flex: 1,
  overflow: 'auto',
  padding: `${theme.spacing.small}px ${theme.spacing.small}px ${theme.spacing.small}px ${theme.spacing.medium}px`,
}))

const DiffContentSC = styled.div({
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
})

const DiffCodeSC = styled.div({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
})

const DiffStateSC = styled.div(({ theme }) => ({
  padding: theme.spacing.large,
}))

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

const TreeLabelSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minWidth: 0,
})

const TreeIconSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginRight: theme.spacing.xsmall,
  color: theme.colors['icon-default'],
  flexShrink: 0,
}))

const TreeTextSC = styled.span({
  ...TRUNCATE_LEFT,
  minWidth: 0,
})
