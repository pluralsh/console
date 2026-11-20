import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { TreeItem, treeItemClasses } from '@mui/x-tree-view/TreeItem'
import { FolderIcon, Spinner, Tooltip } from '@pluralsh/design-system'
import {
  FileTypeIcon,
  fileTreeMuiTheme,
  StyledTreeView,
  TreeItemIcon,
  TreeItemText,
} from 'components/utils/fileTree'
import { Body2P } from 'components/utils/typography/Text'
import { uniq } from 'lodash'
import { ReactNode, useEffect, useState } from 'react'
import styled from 'styled-components'
import { DevboxUnavailable } from './DevboxUnavailable'
import {
  DevboxFileEntry,
  DevboxWorkspaceApi,
  isDirectory,
} from './devboxWorkspaceApi'

const ROOT = '~'

// directories and status rows get prefixed item ids so selection can tell them from files
const DIR_PREFIX = 'dir:'
const STATUS_PREFIX = 'status:'
const trimSlash = (path: string) => path.replace(/\/$/, '')
const dirItemId = (path: string) => `${DIR_PREFIX}${trimSlash(path)}`

// directories containing a path, plus the path itself when it's a directory
function revealedDirectories(path: Nullable<string>): string[] {
  if (!path) return []
  const parts = path.split('/').filter(Boolean)
  const dirs = path.endsWith('/') ? parts : parts.slice(0, -1)
  return dirs.map((_, i) => dirItemId(`/${dirs.slice(0, i + 1).join('/')}`))
}

export function DevboxFilesTab({
  api,
  live,
  selected,
  onSelect,
}: {
  api: DevboxWorkspaceApi
  live: boolean
  selected: Nullable<string>
  onSelect: (path: string) => void
}) {
  const [expanded, setExpanded] = useState<string[]>(() =>
    revealedDirectories(selected)
  )
  const [prevSelected, setPrevSelected] = useState(selected)

  // reveal paths opened from outside the tree, eg a mention or the changes tab
  if (selected !== prevSelected) {
    setPrevSelected(selected)
    const required = revealedDirectories(selected)
    if (required.some((id) => !expanded.includes(id)))
      setExpanded(uniq([...expanded, ...required]))
  }

  if (!api.listFiles)
    return (
      <PaddedSC>
        <DevboxUnavailable
          title="Files unavailable"
          message="Console doesn't serve devbox files yet (devboxFiles, devboxFile)."
        />
      </PaddedSC>
    )
  if (!live)
    return (
      <PaddedSC>
        <DevboxUnavailable
          title="Instance isn't running"
          message="Resume the instance to browse its files."
        />
      </PaddedSC>
    )

  const selectedItem = selected?.endsWith('/')
    ? dirItemId(selected)
    : (selected ?? null)

  return (
    <TreeSC>
      <MuiThemeProvider theme={fileTreeMuiTheme}>
        <StyledTreeView
          itemChildrenIndentation={12}
          expandedItems={expanded}
          onExpandedItemsChange={(_, ids) => setExpanded(ids)}
          selectedItems={selectedItem}
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
            api={api}
            path={ROOT}
            expanded={expanded}
            selected={selected}
          />
        </StyledTreeView>
      </MuiThemeProvider>
    </TreeSC>
  )
}

// each directory only lists its children once it's expanded
function DirectoryEntries({
  api,
  path,
  expanded,
  selected,
}: {
  api: DevboxWorkspaceApi
  path: string
  expanded: string[]
  selected: Nullable<string>
}) {
  const [entries, setEntries] = useState<Nullable<DevboxFileEntry[]>>(null)
  const [error, setError] = useState<Nullable<Error>>(null)

  useEffect(() => {
    api
      .listFiles?.(path)
      .then((list) =>
        setEntries(
          list.toSorted(
            (a, b) =>
              Number(isDirectory(b)) - Number(isDirectory(a)) ||
              a.name.localeCompare(b.name)
          )
        )
      )
      .catch(setError)
  }, [api, path])

  if (error)
    return (
      <StatusItem
        path={path}
        label="Couldn’t load"
        danger
      />
    )
  if (!entries)
    return (
      <StatusItem
        path={path}
        label={
          <>
            <Spinner size={12} /> Loading…
          </>
        }
      />
    )
  if (!entries.length)
    return (
      <StatusItem
        path={path}
        label="Empty folder"
      />
    )

  return entries.map((entry) => {
    if (!isDirectory(entry))
      return (
        <TreeItem
          key={entry.path}
          itemId={entry.path}
          className={entry.path === selected ? 'file-selected' : undefined}
          label={
            <EntryLabel
              name={entry.name}
              icon={
                <FileTypeIcon
                  fileName={entry.name}
                  size={16}
                />
              }
            />
          }
        />
      )

    const id = dirItemId(entry.path)
    return (
      <TreeItem
        key={entry.path}
        itemId={id}
        className={
          selected?.startsWith(`${trimSlash(entry.path)}/`)
            ? 'parent-of-selected'
            : undefined
        }
        label={
          <EntryLabel
            name={entry.name}
            icon={<FolderIcon size={14} />}
          />
        }
      >
        {expanded.includes(id) ? (
          <DirectoryEntries
            api={api}
            path={entry.path}
            expanded={expanded}
            selected={selected}
          />
        ) : (
          // keeps the expand affordance until the directory is listed
          <StatusItem
            path={entry.path}
            label=""
          />
        )}
      </TreeItem>
    )
  })
}

function EntryLabel({ name, icon }: { name: string; icon: ReactNode }) {
  return (
    <Tooltip label={name}>
      <EntryNameSC>
        <TreeItemIcon>{icon}</TreeItemIcon>
        <TreeItemText>{name}</TreeItemText>
      </EntryNameSC>
    </Tooltip>
  )
}

function StatusItem({
  path,
  label,
  danger = false,
}: {
  path: string
  label: ReactNode
  danger?: boolean
}) {
  return (
    <TreeItem
      itemId={`${STATUS_PREFIX}${path}`}
      disabled
      label={
        <Body2P
          $color={danger ? 'text-danger-light' : 'text-xlight'}
          css={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        >
          {label}
        </Body2P>
      }
    />
  )
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

const EntryNameSC = styled.div({
  display: 'flex',
  marginLeft: '0.375rem',
  alignItems: 'center',
  flex: 1,
  minWidth: 0,
})

const PaddedSC = styled.div(({ theme }) => ({ padding: theme.spacing.medium }))
