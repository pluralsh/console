import {
  Button,
  CaretDownIcon,
  CaretRightIcon,
  Chip,
  Code,
  CodeEditor,
  FileIcon,
  Flex,
  FolderIcon,
  ReloadIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { CaptionP } from 'components/utils/typography/Text'
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { DevboxUnavailable } from './DevboxUnavailable'
import {
  DevboxChangeGroup,
  DevboxFileContent,
  DevboxFileEntry,
  DevboxWorkspaceApi,
  isDirectory,
} from './devboxWorkspaceApi'

const ROOT = '~'

export function DevboxFilesTab({
  api,
  live,
  initialPath,
}: {
  api: DevboxWorkspaceApi
  live: boolean
  initialPath?: Nullable<string>
}) {
  const [view, setView] = useState<'changes' | 'files'>('changes')
  const [selected, setSelected] = useState<Nullable<string>>(
    initialPath ?? null
  )
  if (!api.listFiles && !api.changes)
    return (
      <DevboxUnavailable
        title="Files unavailable"
        message="Console doesn't serve devbox files yet (devboxFiles, devboxFile, devboxChanges)."
      />
    )
  if (!live)
    return (
      <DevboxUnavailable
        title="Instance isn't running"
        message="Resume the instance to browse its files."
      />
    )
  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
    >
      <Flex gap="xsmall">
        <Button
          small
          secondary={view !== 'changes'}
          onClick={() => setView('changes')}
          disabled={!api.changes}
        >
          Changes
        </Button>
        <Button
          small
          secondary={view !== 'files'}
          onClick={() => setView('files')}
          disabled={!api.listFiles}
        >
          Files
        </Button>
      </Flex>
      {view === 'changes' && api.changes ? (
        <DevboxChanges
          changes={api.changes}
          onOpen={(path) => {
            setSelected(path)
            setView('files')
          }}
        />
      ) : (
        <SplitSC>
          <TreeSC>
            <DirectoryNode
              api={api}
              entry={{ path: ROOT, name: ROOT, type: 'directory' }}
              selected={selected}
              onSelect={setSelected}
              defaultOpen
            />
          </TreeSC>
          <ViewerSC>
            {selected ? (
              <FileViewer
                key={selected}
                api={api}
                path={selected}
              />
            ) : (
              <CaptionP $color="text-xlight">Pick a file</CaptionP>
            )}
          </ViewerSC>
        </SplitSC>
      )}
    </Flex>
  )
}

function DirectoryNode({
  api,
  entry,
  selected,
  onSelect,
  defaultOpen = false,
  depth = 0,
}: {
  api: DevboxWorkspaceApi
  entry: DevboxFileEntry
  selected: Nullable<string>
  onSelect: (path: string) => void
  defaultOpen?: boolean
  depth?: number
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [children, setChildren] = useState<Nullable<DevboxFileEntry[]>>(null)
  const [error, setError] = useState<Nullable<Error>>(null)

  useEffect(() => {
    if (!open || children || !api.listFiles) return
    api
      .listFiles(entry.path)
      .then((entries) =>
        setChildren(
          entries.toSorted(
            (a, b) =>
              Number(isDirectory(b)) - Number(isDirectory(a)) ||
              a.name.localeCompare(b.name)
          )
        )
      )
      .catch(setError)
  }, [api, children, entry.path, open])

  return (
    <div>
      <TreeRowSC
        type="button"
        $depth={depth}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <CaretDownIcon size={10} /> : <CaretRightIcon size={10} />}
        <FolderIcon size={12} />
        {entry.name}
      </TreeRowSC>
      {open && error && (
        <CaptionP
          $color="text-danger"
          css={{ paddingLeft: (depth + 1) * 12 }}
        >
          {error.message}
        </CaptionP>
      )}
      {open &&
        children?.map((child) =>
          isDirectory(child) ? (
            <DirectoryNode
              key={child.path}
              api={api}
              entry={child}
              selected={selected}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ) : (
            <TreeRowSC
              key={child.path}
              type="button"
              $depth={depth + 1}
              $selected={child.path === selected}
              onClick={() => onSelect(child.path)}
            >
              <FileIcon size={12} />
              {child.name}
            </TreeRowSC>
          )
        )}
    </div>
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

  if (error) return <GqlError error={error} />
  if (!file) return <CaptionP $color="text-xlight">Loading…</CaptionP>
  if (file.binary)
    return <CaptionP $color="text-xlight">Binary file, not shown.</CaptionP>

  const editable = !!api.writeFile && !file.truncated
  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
    >
      <Flex
        justify="space-between"
        align="center"
      >
        <CaptionP $color="text-light">{path}</CaptionP>
        <Flex gap="xsmall">
          {file.truncated && (
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
        </Flex>
      </Flex>
      {editable ? (
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
      ) : (
        <Code language={languageForPath(path)}>{file.content ?? ''}</Code>
      )}
    </Flex>
  )
}

function DevboxChanges({
  changes,
  onOpen,
}: {
  changes: NonNullable<DevboxWorkspaceApi['changes']>
  onOpen: (path: string) => void
}) {
  const [groups, setGroups] = useState<Nullable<DevboxChangeGroup[]>>(null)
  const [error, setError] = useState<Nullable<Error>>(null)
  const load = useCallback(() => {
    changes()
      .then((g) => {
        setGroups(g)
        setError(null)
      })
      .catch(setError)
  }, [changes])
  useEffect(() => load(), [load])

  if (error) return <GqlError error={error} />
  if (!groups) return <CaptionP $color="text-xlight">Loading changes…</CaptionP>
  if (!groups.some((g) => g.files.length))
    return <CaptionP $color="text-xlight">No uncommitted changes.</CaptionP>
  return (
    <DevboxChangeGroups
      groups={groups}
      onOpen={onOpen}
      onRefresh={load}
    />
  )
}

export function DevboxChangeGroups({
  groups,
  onOpen,
  onRefresh,
}: {
  groups: DevboxChangeGroup[]
  onOpen?: (path: string) => void
  onRefresh?: () => void
}) {
  return (
    <Flex
      direction="column"
      gap="large"
      css={{ overflowY: 'auto' }}
    >
      {onRefresh && (
        <Button
          small
          tertiary
          startIcon={<ReloadIcon />}
          onClick={onRefresh}
          css={{ alignSelf: 'flex-end' }}
        >
          Refresh
        </Button>
      )}
      {groups
        .filter((g) => g.files.length)
        .map((group) => (
          <Flex
            key={group.repository}
            direction="column"
            gap="small"
          >
            <Flex
              gap="small"
              align="center"
            >
              <strong>{group.repository}</strong>
              {group.branch && <Chip size="small">{group.branch}</Chip>}
              <CaptionP $color="text-xlight">
                {group.files.length} file{group.files.length === 1 ? '' : 's'}
              </CaptionP>
            </Flex>
            {group.files.map((file) => (
              <Flex
                key={file.path}
                direction="column"
                gap="xxsmall"
              >
                <Flex
                  gap="small"
                  align="center"
                >
                  <FileLinkSC
                    type="button"
                    onClick={() =>
                      onOpen?.(
                        group.path ? `${group.path}/${file.path}` : file.path
                      )
                    }
                  >
                    {file.oldPath
                      ? `${file.oldPath} → ${file.path}`
                      : file.path}
                  </FileLinkSC>
                  {file.status && <Chip size="small">{file.status}</Chip>}
                  {(file.additions != null || file.deletions != null) && (
                    <CaptionP $color="text-xlight">
                      +{file.additions ?? 0} −{file.deletions ?? 0}
                    </CaptionP>
                  )}
                </Flex>
                {file.binary ? (
                  <CaptionP $color="text-xlight">Binary file</CaptionP>
                ) : file.patch ? (
                  <Code language="diff">{file.patch}</Code>
                ) : null}
              </Flex>
            ))}
          </Flex>
        ))}
    </Flex>
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

const SplitSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  gap: theme.spacing.medium,
}))

const TreeSC = styled.div(({ theme }) => ({
  width: 280,
  flexShrink: 0,
  overflowY: 'auto',
  borderRight: theme.borders.default,
  paddingRight: theme.spacing.small,
}))

const ViewerSC = styled.div({ flex: 1, minWidth: 0, overflow: 'auto' })

const TreeRowSC = styled.button<{ $depth: number; $selected?: boolean }>(
  ({ theme, $depth, $selected }) => ({
    ...theme.partials.text.caption,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xxsmall,
    width: '100%',
    padding: `2px ${theme.spacing.xsmall}px`,
    paddingLeft: $depth * 12 + theme.spacing.xsmall,
    background: $selected ? theme.colors['fill-zero-selected'] : 'none',
    border: 'none',
    cursor: 'pointer',
    color: theme.colors.text,
    textAlign: 'left',
    whiteSpace: 'nowrap',
  })
)

const FileLinkSC = styled.button(({ theme }) => ({
  ...theme.partials.text.code,
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  color: theme.colors['text-primary-accent'],
}))
