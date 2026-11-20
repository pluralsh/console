import {
  Button,
  Chip,
  CloseIcon,
  Code,
  CodeEditor,
  IconFrame,
  ReloadIcon,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { FileTypeIcon } from 'components/utils/fileTree'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP } from 'components/utils/typography/Text'
import { PathBreadcrumb } from 'components/workbenches/workbench/files/WorkbenchFileViewer'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { basename } from '../files/workbenchFilePaths'
import { DevboxFileContent, DevboxWorkspaceApi } from './devboxWorkspaceApi'

export function DevboxFileViewer({
  api,
  path,
  onClose,
}: {
  api: DevboxWorkspaceApi
  path: string
  onClose: () => void
}) {
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
    <ViewerSC>
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
          <IconFrame
            clickable
            aria-label="Close file"
            icon={<CloseIcon />}
            onClick={onClose}
            tooltip="Close file"
          />
        </HeaderActionsSC>
      </ViewerHeaderSC>
      <ViewerBodySC>{body}</ViewerBodySC>
    </ViewerSC>
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

const ViewerSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  backgroundColor: theme.colors['fill-zero'],
}))

const ViewerHeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  boxSizing: 'border-box',
  minHeight: 48,
  padding: `${theme.spacing.xsmall} ${theme.spacing.large}`,
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

// the code card's own border and rounding double up against the viewport edges
const ViewerBodySC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  '& > *': { border: 'none', borderRadius: 0 },
})

const PaddedSC = styled.div(({ theme }) => ({ padding: theme.spacing.medium }))
