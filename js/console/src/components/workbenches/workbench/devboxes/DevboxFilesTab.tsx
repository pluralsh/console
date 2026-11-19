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
import styled, { DefaultTheme } from 'styled-components'
import { DevboxUnavailable } from './DevboxUnavailable'
import {
  DevboxFileContent,
  DevboxFileEntry,
  DevboxWorkspaceApi,
  isDirectory,
} from './devboxWorkspaceApi'

const ROOT = '~'

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
  if (!api.listFiles)
    return (
      <DevboxUnavailable
        title="Files unavailable"
        message="Console doesn't serve devbox files yet (devboxFiles, devboxFile)."
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
    <SplitSC>
      <TreeSC>
        <DirectoryNode
          api={api}
          entry={{ path: ROOT, name: ROOT, type: 'directory' }}
          selected={selected}
          onSelect={onSelect}
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
    if (!open || children || error || !api.listFiles) return
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
  }, [api, children, entry.path, error, open])

  return (
    <div>
      <TreeRowSC
        type="button"
        $depth={depth}
        onClick={() => {
          setOpen((o) => !o)
          setError(null)
        }}
      >
        {open ? <CaretDownIcon size={10} /> : <CaretRightIcon size={10} />}
        <FolderIcon size={12} />
        {entry.name}
      </TreeRowSC>
      {open && (error || !children || !children.length) && (
        <TreeNoteSC
          $depth={depth + 1}
          $danger={!!error}
        >
          {error ? error.message : !children ? 'Loading…' : 'Empty'}
        </TreeNoteSC>
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
  width: 200,
  flexShrink: 0,
  overflowY: 'auto',
  borderRight: theme.borders.default,
  paddingRight: theme.spacing.small,
}))

const ViewerSC = styled.div({ flex: 1, minWidth: 0, overflow: 'auto' })

const treeIndent = (theme: DefaultTheme, depth: number) =>
  `calc(${depth * 12}px + ${theme.spacing.xsmall})`

const TreeRowSC = styled.button<{ $depth: number; $selected?: boolean }>(
  ({ theme, $depth, $selected }) => ({
    ...theme.partials.text.caption,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xxsmall,
    width: '100%',
    padding: `2px ${theme.spacing.xsmall}`,
    paddingLeft: treeIndent(theme, $depth),
    borderRadius: theme.borderRadiuses.medium,
    background: $selected ? theme.colors['fill-zero-selected'] : 'none',
    border: 'none',
    cursor: 'pointer',
    color: theme.colors.text,
    textAlign: 'left',
    whiteSpace: 'nowrap',
    '&:hover': {
      background: $selected ? undefined : theme.colors['fill-zero-hover'],
    },
  })
)

const TreeNoteSC = styled.div<{ $depth: number; $danger: boolean }>(
  ({ theme, $depth, $danger }) => ({
    ...theme.partials.text.caption,
    padding: `2px ${theme.spacing.xsmall}`,
    paddingLeft: treeIndent(theme, $depth),
    color: theme.colors[$danger ? 'text-danger' : 'text-xlight'],
  })
)
