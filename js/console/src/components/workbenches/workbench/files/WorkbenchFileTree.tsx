import { useApolloClient } from '@apollo/client'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { TreeItem } from '@mui/x-tree-view/TreeItem'
import {
  FolderIcon,
  IconFrame,
  ReloadIcon,
  Spinner,
  Tooltip,
  TrashCanIcon,
} from '@pluralsh/design-system'
import {
  FileTypeIcon,
  fileTreeMuiTheme,
  StyledTreeView,
  TreeItemIcon,
  TreeItemText,
} from 'components/utils/fileTree'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  useWorkbenchFilesQuery,
  WorkbenchFileFragment,
  WorkbenchFileKind,
} from 'generated/graphql'
import { uniq } from 'lodash'
import { ReactNode, useState } from 'react'
import { PAGE_TOOLBAR_HEIGHT } from 'components/layout/PageToolbar'
import styled from 'styled-components'
import { WORKBENCH_SIDEBAR_WIDTH } from '../WorkbenchSidePanel'
import { ancestorDirectories } from './workbenchFilePaths'

// directories and status rows get prefixed item ids so selection can tell them from files
const DIR_PREFIX = 'dir:'
const STATUS_PREFIX = 'status:'
const dirItemId = (path: string) => `${DIR_PREFIX}${path}`

export const WORKBENCH_FILES_HEADER_HEIGHT = PAGE_TOOLBAR_HEIGHT

export function WorkbenchFileTree({
  workbenchId,
  selectedPath,
  onSelect,
  onDelete,
}: {
  workbenchId: string
  selectedPath: Nullable<string>
  onSelect: (path: string) => void
  onDelete: (file: WorkbenchFileFragment) => void
}) {
  const client = useApolloClient()
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<string[]>(() =>
    ancestorDirectories(selectedPath).map(dirItemId)
  )
  const [prevSelectedPath, setPrevSelectedPath] = useState(selectedPath)

  // reveal files selected from outside the tree, eg a file reference in a job
  if (selectedPath !== prevSelectedPath) {
    setPrevSelectedPath(selectedPath)
    const required = ancestorDirectories(selectedPath).map(dirItemId)
    if (required.some((id) => !expanded.includes(id)))
      setExpanded(uniq([...expanded, ...required]))
  }

  const refresh = async () => {
    setRefreshing(true)
    try {
      await client.refetchQueries({ include: ['WorkbenchFiles'] })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <WrapperSC>
      <HeaderSC>
        <Body2BoldP>Files</Body2BoldP>
        <IconFrame
          clickable
          size="small"
          type="tertiary"
          tooltip="Refresh"
          icon={refreshing ? <Spinner size={12} /> : <ReloadIcon />}
          onClick={refresh}
        />
      </HeaderSC>
      <TreeScrollSC>
        <MuiThemeProvider theme={fileTreeMuiTheme}>
          <StyledTreeView
            itemChildrenIndentation={12}
            expandedItems={expanded}
            onExpandedItemsChange={(_, ids) => setExpanded(ids)}
            selectedItems={selectedPath ?? null}
            onItemSelectionToggle={(_, id, isSelected) => {
              if (
                isSelected &&
                !id.startsWith(DIR_PREFIX) &&
                !id.startsWith(STATUS_PREFIX)
              )
                onSelect(id)
            }}
          >
            <DirectoryEntries
              workbenchId={workbenchId}
              path="/"
              expanded={expanded}
              selectedPath={selectedPath}
              onDelete={onDelete}
            />
          </StyledTreeView>
        </MuiThemeProvider>
      </TreeScrollSC>
    </WrapperSC>
  )
}

// each directory only lists its children once it's expanded
function DirectoryEntries({
  workbenchId,
  path,
  expanded,
  selectedPath,
  onDelete,
}: {
  workbenchId: string
  path: string
  expanded: string[]
  selectedPath: Nullable<string>
  onDelete: (file: WorkbenchFileFragment) => void
}) {
  const { data, loading, error } = useWorkbenchFilesQuery({
    variables: { id: workbenchId, path },
    fetchPolicy: 'cache-and-network',
  })
  const files = data?.workbench?.files

  if (!files && loading)
    return (
      <StatusItem
        path={path}
        label={
          <>
            <Spinner size={12} /> Loading
          </>
        }
      />
    )
  if (error && !files)
    return (
      <StatusItem
        path={path}
        label="Failed to load"
      />
    )
  if (!files?.length)
    return (
      <StatusItem
        path={path}
        label="Empty"
      />
    )

  return files.map((file) => {
    if (!file) return null
    const isParentOfSelected =
      file.kind === WorkbenchFileKind.Directory &&
      !!selectedPath?.startsWith(`${file.path}/`)
    const isSelected = file.path === selectedPath

    return file.kind === WorkbenchFileKind.Directory ? (
      <TreeItem
        key={file.path}
        itemId={dirItemId(file.path)}
        className={isParentOfSelected ? 'parent-of-selected' : undefined}
        label={
          <EntryLabel
            name={file.name}
            icon={<FolderIcon size={14} />}
            onDelete={() => onDelete(file)}
          />
        }
      >
        {expanded.includes(dirItemId(file.path)) ? (
          <DirectoryEntries
            workbenchId={workbenchId}
            path={file.path}
            expanded={expanded}
            selectedPath={selectedPath}
            onDelete={onDelete}
          />
        ) : (
          // keeps the expand affordance until the directory is listed
          <StatusItem
            path={file.path}
            label=""
          />
        )}
      </TreeItem>
    ) : (
      <TreeItem
        key={file.path}
        itemId={file.path}
        className={isSelected ? 'file-selected' : undefined}
        label={
          <EntryLabel
            name={file.name}
            icon={<FileTypeIcon fileName={file.name} />}
            onDelete={() => onDelete(file)}
          />
        }
      />
    )
  })
}

function EntryLabel({
  name,
  icon,
  onDelete,
}: {
  name: string
  icon: ReactNode
  onDelete: () => void
}) {
  return (
    <EntryLabelSC>
      <Tooltip
        label={name}
        css={{ marginLeft: 6 }}
      >
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            minWidth: 0,
          }}
        >
          <TreeItemIcon>{icon}</TreeItemIcon>
          <TreeItemText>{name}</TreeItemText>
        </div>
      </Tooltip>
      <IconFrame
        className="delete"
        clickable
        size="xsmall"
        type="tertiary"
        tooltip="Delete"
        icon={<TrashCanIcon color="icon-danger" />}
        // keeps the tree from selecting or toggling the row
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      />
    </EntryLabelSC>
  )
}

function StatusItem({ path, label }: { path: string; label: ReactNode }) {
  return (
    <TreeItem
      itemId={`${STATUS_PREFIX}${path}`}
      disabled
      label={
        <CaptionP
          $color="text-xlight"
          css={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {label}
        </CaptionP>
      }
    />
  )
}

const EntryLabelSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minWidth: 0,
  '.delete': { opacity: 0, flexShrink: 0 },
  '&:hover .delete, .delete:focus-visible': { opacity: 1 },
})

const WrapperSC = styled.div(({ theme }) => ({
  alignSelf: 'stretch',
  backgroundColor: theme.colors['fill-accent'],
  borderRight: theme.borders.hairline,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  width: WORKBENCH_SIDEBAR_WIDTH,
  maxWidth: WORKBENCH_SIDEBAR_WIDTH,
  minWidth: WORKBENCH_SIDEBAR_WIDTH,
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxSizing: 'border-box',
  height: WORKBENCH_FILES_HEADER_HEIGHT,
  flexShrink: 0,
  padding: `0 ${theme.spacing.medium}px`,
  borderBottom: theme.borders.hairline,
}))

const TreeScrollSC = styled.div(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: theme.spacing.small,
}))
