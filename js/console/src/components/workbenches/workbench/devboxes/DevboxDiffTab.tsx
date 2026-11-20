import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { TreeItem, treeItemClasses } from '@mui/x-tree-view/TreeItem'
import {
  Chip,
  GitCompareIcon,
  FolderIcon,
  IconFrame,
  ReloadIcon,
  Spinner,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  FILE_TREE_GLYPH_SIZE,
  FILE_TREE_ICON_SIZE,
  FileTypeIcon,
  fileTreeMuiTheme,
  StyledTreeView,
  TreeItemIcon,
  TreeItemText,
} from 'components/utils/fileTree'
import { CaptionP } from 'components/utils/typography/Text'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import styled, { DefaultTheme } from 'styled-components'
import {
  ALL_CHANGES,
  buildChangeTree,
  CHANGE_STATUS_LETTERS,
  ChangeTreeNode,
  changeTreeDirIds,
  useDevboxChanges,
} from './devboxChanges'
import { DevboxUnavailable } from './DevboxUnavailable'
import { DevboxChangedFile } from './devboxWorkspaceApi'

// the changes tab lists what changed; picking a file shows its diff in the main view
export function DevboxDiffTab({
  instanceId,
  live,
  selected,
  onSelect,
  headerActions,
}: {
  instanceId: string
  live: boolean
  selected: Nullable<string>
  onSelect: (change: string) => void
  headerActions?: Nullable<HTMLElement>
}) {
  const { groups, error, loading, refetch } = useDevboxChanges(
    instanceId,
    live,
    { poll: true }
  )
  const [collapsed, setCollapsed] = useState<string[]>([])

  if (!live)
    return (
      <PaddedSC>
        <DevboxUnavailable
          title="Instance isn't running"
          message="Resume the instance to see its changes."
        />
      </PaddedSC>
    )

  const tree = buildChangeTree(groups ?? [])
  const dirIds = changeTreeDirIds(tree)
  const fileCount = (groups ?? []).reduce((n, g) => n + g.files.length, 0)

  return (
    <TreeSC>
      {headerActions &&
        createPortal(
          <IconFrame
            clickable
            icon={loading && groups ? <Spinner size={14} /> : <ReloadIcon />}
            onClick={() => refetch()}
            tooltip="Refresh changes"
          />,
          headerActions
        )}
      {error && !groups && <GqlError error={error} />}
      <MuiThemeProvider theme={fileTreeMuiTheme}>
        <StyledTreeView
          itemChildrenIndentation={12}
          expandedItems={dirIds.filter((id) => !collapsed.includes(id))}
          onExpandedItemsChange={(_, ids) =>
            setCollapsed(dirIds.filter((id) => !ids.includes(id)))
          }
          selectedItems={selected ?? null}
          onItemSelectionToggle={(_, id, isSelected) => {
            if (isSelected && !dirIds.includes(id)) onSelect(id)
          }}
        >
          <TreeItem
            itemId={ALL_CHANGES}
            label={
              <RowSC>
                <TreeItemIcon>
                  <GitCompareIcon size={FILE_TREE_GLYPH_SIZE} />
                </TreeItemIcon>
                <TreeItemText>All changes</TreeItemText>
                <MetaSC>
                  {groups ? (
                    <CaptionP $color="text-xlight">{fileCount}</CaptionP>
                  ) : (
                    <Spinner size={12} />
                  )}
                </MetaSC>
              </RowSC>
            }
          />
          {tree.map((node) => (
            <ChangeTreeItem
              key={node.id}
              node={node}
              selected={selected}
            />
          ))}
        </StyledTreeView>
      </MuiThemeProvider>
      {groups && !fileCount && (
        <PaddedSC>
          <CaptionP $color="text-xlight">No uncommitted changes.</CaptionP>
        </PaddedSC>
      )}
    </TreeSC>
  )
}

function ChangeTreeItem({
  node,
  selected,
}: {
  node: ChangeTreeNode
  selected: Nullable<string>
}) {
  if (node.kind === 'file')
    return (
      <TreeItem
        itemId={node.id}
        className={node.id === selected ? 'file-selected' : undefined}
        label={
          <RowSC title={node.file.path}>
            <TreeItemIcon>
              <FileTypeIcon
                fileName={node.name}
                size={FILE_TREE_ICON_SIZE}
              />
            </TreeItemIcon>
            <NameSC $deleted={node.file.status === 'deleted'}>
              {node.name}
            </NameSC>
            <MetaSC>
              <FileStat file={node.file} />
              <StatusLetterSC $status={node.file.status}>
                {CHANGE_STATUS_LETTERS[node.file.status ?? ''] ?? 'M'}
              </StatusLetterSC>
            </MetaSC>
          </RowSC>
        }
      />
    )
  return (
    <TreeItem
      itemId={node.id}
      className={
        selected && descendantIds(node).includes(selected)
          ? 'parent-of-selected'
          : undefined
      }
      label={
        <RowSC>
          <TreeItemIcon>
            <FolderIcon size={FILE_TREE_GLYPH_SIZE} />
          </TreeItemIcon>
          <TreeItemText>{node.name}</TreeItemText>
          <MetaSC>
            {node.repository?.branch && (
              <Chip size="small">{node.repository.branch}</Chip>
            )}
            <DotSC aria-hidden />
          </MetaSC>
        </RowSC>
      }
    >
      {node.children.map((child) => (
        <ChangeTreeItem
          key={child.id}
          node={child}
          selected={selected}
        />
      ))}
    </TreeItem>
  )
}

function FileStat({ file }: { file: DevboxChangedFile }) {
  if (file.binary) return <CaptionP $color="text-xlight">bin</CaptionP>
  return (
    <>
      {!!file.additions && <AddSC>+{file.additions}</AddSC>}
      {!!file.deletions && <DelSC>−{file.deletions}</DelSC>}
    </>
  )
}

const descendantIds = (node: ChangeTreeNode): string[] =>
  node.kind === 'file' ? [node.id] : node.children.flatMap(descendantIds)

const statusColor = (theme: DefaultTheme, status: Nullable<string>) => {
  switch (status) {
    case 'deleted':
    case 'conflicted':
      return theme.colors['text-danger']
    case 'modified':
    case 'type_changed':
      return theme.colors['text-warning']
    case 'renamed':
    case 'copied':
      return theme.colors['text-primary-accent']
    default:
      return theme.colors['text-success']
  }
}

const TreeSC = styled.div(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  overflow: 'auto',
  padding: theme.spacing.small,
  backgroundColor: theme.colors['fill-accent'],
  [`&& .${treeItemClasses.content}`]: {
    ...theme.partials.text.caption,
    padding: `${theme.spacing.xxxsmall} ${theme.spacing.xsmall}`,
  },
}))

const RowSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  minWidth: 0,
  marginLeft: '0.375rem',
})

const NameSC = styled(TreeItemText)<{ $deleted: boolean }>(({ $deleted }) => ({
  textDecoration: $deleted ? 'line-through' : undefined,
}))

const MetaSC = styled.span(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  flexShrink: 0,
  marginLeft: 'auto',
  paddingLeft: theme.spacing.small,
}))

const AddSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-success'],
}))

const DelSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-danger'],
}))

const StatusLetterSC = styled.span<{ $status: Nullable<string> }>(
  ({ theme, $status }) => ({
    ...theme.partials.text.caption,
    fontWeight: 600,
    width: 12,
    textAlign: 'center',
    color: statusColor(theme, $status),
  })
)

const DotSC = styled.span(({ theme }) => ({
  width: 6,
  height: 6,
  marginRight: 3,
  borderRadius: '50%',
  backgroundColor: theme.colors['icon-success'],
  opacity: 0.6,
}))

const PaddedSC = styled.div(({ theme }) => ({ padding: theme.spacing.medium }))
