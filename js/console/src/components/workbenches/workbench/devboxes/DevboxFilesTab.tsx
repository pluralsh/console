import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { TreeItem, treeItemClasses } from '@mui/x-tree-view/TreeItem'
import {
  Button,
  Chip,
  Code,
  CodeEditor,
  FolderIcon,
  ReloadIcon,
  Spinner,
  Tooltip,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import {
  FileTypeIcon,
  fileTreeMuiTheme,
  StyledTreeView,
  TreeItemIcon,
  TreeItemText,
} from 'components/utils/fileTree'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import { PathBreadcrumb } from 'components/workbenches/workbench/files/WorkbenchFileViewer'
import { uniq } from 'lodash'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { basename } from '../files/workbenchFilePaths'
import { DevboxUnavailable } from './DevboxUnavailable'
import {
  DevboxFileContent,
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
    <SplitSC>
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
      <ViewerSC>
        {selected && !selected.endsWith('/') ? (
          <FileViewer
            key={selected}
            api={api}
            path={selected}
          />
        ) : (
          <PaddedSC>
            <CaptionP $color="text-xlight">Pick a file</CaptionP>
          </PaddedSC>
        )}
      </ViewerSC>
    </SplitSC>
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

function FileViewer({ api, path }: { api: DevboxWorkspaceApi; path: string }) {
  const [file, setFile] = useState<Nullable<DevboxFileContent>>(null)
  const [error, setError] = useState<Nullable<Error>>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    api
      .readFile?.(path)
      .then((f) => {
        setFile(f)
        setError(null)
      })
      .catch(setError)
  }, [api, path])
  useEffect(() => load(), [load])

  const editable = !!file && !file.binary && !!api.writeFile && !file.truncated
  let body: ReactNode
  if (error)
    body = (
      <PaddedSC>
        <GqlError error={error} />
      </PaddedSC>
    )
  else if (!file)
    body = (
      <RectangleSkeleton
        $height="100%"
        $width="100%"
      />
    )
  else if (file.binary)
    body = (
      <PaddedSC>
        <CaptionP $color="text-xlight">Binary file, not shown.</CaptionP>
      </PaddedSC>
    )
  else if (editable)
    body = (
      <CodeEditor
        value={file.content ?? ''}
        language={languageForPath(path)}
        height="100%"
        save
        saving={saving}
        onSave={(content) => {
          setSaving(true)
          api.writeFile!(path, content, file.sha256)
            .then(setFile)
            // a sha mismatch means someone (often the agent) changed it
            .catch((e) => setError(e as Error))
            .then(() => setSaving(false))
        }}
      />
    )
  else
    body = (
      <Code
        height="100%"
        language={languageForPath(path)}
        showHeader={false}
        showLineNumbers
      >
        {file.content ?? ''}
      </Code>
    )

  return (
    <>
      <ViewerHeaderSC>
        <FileTypeIcon
          fileName={basename(path)}
          size={20}
        />
        <PathBreadcrumb path={path} />
        <HeaderActionsSC>
          {file?.truncated && (
            <Chip
              size="small"
              severity="warning"
            >
              truncated
            </Chip>
          )}
          <Button
            small
            tertiary
            startIcon={<ReloadIcon />}
            onClick={load}
          >
            Reload
          </Button>
        </HeaderActionsSC>
      </ViewerHeaderSC>
      <ViewerBodySC>{body}</ViewerBodySC>
    </>
  )
}

const EXTENSION_LANGUAGES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  ex: 'elixir',
  exs: 'elixir',
  go: 'go',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  md: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  json: 'json',
  tf: 'hcl',
  sh: 'shell',
}

export function languageForPath(path: string) {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_LANGUAGES[ext] ?? 'plaintext'
}

const SplitSC = styled.div({
  display: 'flex',
  flex: 1,
  minHeight: 0,
})

const TreeSC = styled.div(({ theme }) => ({
  width: 220,
  flexShrink: 0,
  overflow: 'auto',
  padding: theme.spacing.small,
  backgroundColor: theme.colors['fill-accent'],
  borderRight: theme.borders.hairline,
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

const ViewerSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
  minHeight: 0,
})

const ViewerHeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  boxSizing: 'border-box',
  minHeight: 48,
  padding: `${theme.spacing.xsmall} ${theme.spacing.medium}`,
  borderBottom: theme.borders.hairline,
  flexShrink: 0,
}))

const HeaderActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  flexShrink: 0,
  marginLeft: 'auto',
}))

// the code card's own border and rounding double up against the panel edges
const ViewerBodySC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  '& > *': { border: 'none', borderRadius: 0 },
})

const PaddedSC = styled.div(({ theme }) => ({ padding: theme.spacing.medium }))
