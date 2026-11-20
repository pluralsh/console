import {
  Button,
  CheckIcon,
  Code,
  DownloadIcon,
  CopyIcon,
  Markdown,
  Tooltip,
  useCopyText,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { TRUNCATE_LEFT } from 'components/utils/truncate'
import { FileTypeIcon } from 'components/utils/fileTree'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  useWorkbenchFileContentsQuery,
  useWorkbenchFileQuery,
  WorkbenchFileKind,
} from 'generated/graphql'
import { ReactNode } from 'react'
import styled from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import {
  formatFileSize,
  getFileViewerKind,
  getLanguageFromFileName,
} from 'utils/file'
import { WORKBENCH_FILES_HEADER_HEIGHT } from './WorkbenchFileTree'
import { basename, workbenchFileDownloadUrl } from './workbenchFilePaths'
import { WorkbenchEmptyState } from '../../common/WorkbenchEmptyState'

// text previews come back through graphql, so anything larger is download-only
const PREVIEW_LIMIT = 1024 * 1024

export function WorkbenchFileViewer({
  workbenchId,
  path,
}: {
  workbenchId: string
  path: string
}) {
  const { data, loading, error } = useWorkbenchFileQuery({
    variables: { id: workbenchId, path },
    fetchPolicy: 'cache-and-network',
  })
  const file = data?.workbench?.file
  const name = file?.name ?? basename(path)
  const viewerKind = getFileViewerKind(name)
  const isText = viewerKind === 'markdown' || viewerKind === 'text'
  const tooLarge = (file?.size ?? 0) > PREVIEW_LIMIT
  const {
    data: contentsData,
    loading: contentsLoading,
    error: contentsError,
  } = useWorkbenchFileContentsQuery({
    variables: { id: workbenchId, path },
    skip: !file || !isText || tooLarge,
    fetchPolicy: 'cache-and-network',
  })
  const contents = contentsData?.workbench?.fileContents

  if (error && !file)
    return (
      <GqlError
        margin="large"
        error={error}
      />
    )
  if (!file && loading)
    return (
      <RectangleSkeleton
        $height="100%"
        $width="100%"
      />
    )
  if (!file)
    return (
      <WorkbenchEmptyState
        message="File not found"
        description={path}
      />
    )
  if (file.kind === WorkbenchFileKind.Directory)
    return (
      <WorkbenchEmptyState
        message="No file selected"
        description="Select a file from the list to view it."
      />
    )

  const downloadUrl = workbenchFileDownloadUrl(file.downloadUrl)
  // code, pdfs and loading fill the panel edge to edge; empty states, markdown
  // and media keep padding, matching the inset empty cards elsewhere in the console
  let flush = false
  const unavailable = (description: string) => (
    <WorkbenchEmptyState
      inset={false}
      message="Preview unavailable"
      description={description}
    >
      {downloadUrl && <DownloadButton href={downloadUrl} />}
    </WorkbenchEmptyState>
  )

  let body: ReactNode
  if (isText) {
    if (tooLarge) body = unavailable('This file is too large to preview.')
    else if (contentsError && contents == null)
      body = unavailable("This file couldn't be read as text.")
    else if (contents == null && contentsLoading) {
      flush = true
      body = (
        <RectangleSkeleton
          $height="100%"
          $width="100%"
        />
      )
    } else if (viewerKind === 'markdown')
      body = (
        <MarkdownSC>
          <Markdown text={contents ?? ''} />
        </MarkdownSC>
      )
    else {
      flush = true
      body = (
        <FlushCodeSC>
          <Code
            height="100%"
            language={getLanguageFromFileName(name) ?? 'text'}
            showHeader={false}
            showLineNumbers
          >
            {contents ?? ''}
          </Code>
        </FlushCodeSC>
      )
    }
  } else if (!file.downloadUrl) body = unavailable('No download url available.')
  else if (viewerKind === 'image')
    body = (
      <MediaSC>
        <img
          src={file.downloadUrl}
          alt={name}
        />
      </MediaSC>
    )
  else if (viewerKind === 'video')
    body = (
      <MediaSC>
        <video
          controls
          src={file.downloadUrl}
        />
      </MediaSC>
    )
  else if (viewerKind === 'audio')
    body = (
      <MediaSC>
        <audio
          controls
          src={file.downloadUrl}
        />
      </MediaSC>
    )
  else if (viewerKind === 'pdf') {
    flush = true
    body = (
      <PdfSC
        src={file.downloadUrl}
        title={name}
      />
    )
  } else body = unavailable("This file type can't be previewed.")

  const meta = [
    formatFileSize(file.size),
    file.modifiedAt && formatDateTime(file.modifiedAt),
  ].filter(Boolean)

  return (
    <ViewerSC>
      <ViewerHeaderSC>
        <FileTypeIcon
          fileName={name}
          size={20}
        />
        <PathBreadcrumb path={file.sandboxPath} />
        <HeaderActionsSC>
          {meta.length > 0 && (
            <MetaSC>
              {meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </MetaSC>
          )}
          {downloadUrl && <DownloadButton href={downloadUrl} />}
        </HeaderActionsSC>
      </ViewerHeaderSC>
      <ViewerBodySC $flush={flush}>{body}</ViewerBodySC>
    </ViewerSC>
  )
}

function DownloadButton({ href }: { href: string }) {
  return (
    <Button
      secondary
      small
      as="a"
      href={href}
      startIcon={<DownloadIcon />}
    >
      Download
    </Button>
  )
}

// the sandbox path doubles as the header: folders lead to the bolded file name,
// and the whole breadcrumb copies the path agents use to reference the file
function PathBreadcrumb({ path }: { path: string }) {
  const { copied, handleCopy } = useCopyText(path, 2000)
  const segments = path.split('/').filter(Boolean)
  const fileName = segments.pop()

  return (
    <Tooltip
      label={copied ? 'Copied' : 'Copy path'}
      placement="bottom-start"
    >
      <BreadcrumbSC
        type="button"
        onClick={handleCopy}
        aria-label={`Copy path ${path}`}
      >
        <span className="segments">
          {segments.map((segment, i) => (
            <span key={i}>
              <span className="folder">{segment}</span>
              <span className="separator">/</span>
            </span>
          ))}
          <span className="file">{fileName}</span>
        </span>
        <span className="icon">
          {copied ? (
            <CheckIcon
              size={12}
              color="icon-success"
            />
          ) : (
            <CopyIcon size={12} />
          )}
        </span>
      </BreadcrumbSC>
    </Tooltip>
  )
}

const ViewerSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
})

const ViewerHeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  boxSizing: 'border-box',
  height: WORKBENCH_FILES_HEADER_HEIGHT,
  padding: `0 ${theme.spacing.large}`,
  borderBottom: theme.borders.hairline,
  flexShrink: 0,
}))

const BreadcrumbSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.body2,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  flex: '0 1 auto',
  minWidth: 0,
  cursor: 'pointer',
  borderRadius: theme.borderRadiuses.medium,
  // long paths drop leading folders first so the file name stays visible
  '.segments': { ...TRUNCATE_LEFT, minWidth: 0 },
  '.folder': { color: theme.colors['text-xlight'] },
  '.separator': {
    color: theme.colors['text-xlight'],
    margin: `0 ${theme.spacing.xxsmall}`,
  },
  '.file': { ...theme.partials.text.body2Bold, color: theme.colors.text },
  '.icon': {
    display: 'flex',
    flexShrink: 0,
    color: theme.colors['icon-xlight'],
  },
  '&:hover': {
    '.folder': { color: theme.colors['text-light'] },
    '.icon': { color: theme.colors['icon-default'] },
  },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))

const MetaSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'flex',
  gap: theme.spacing.small,
  color: theme.colors['text-xlight'],
  whiteSpace: 'nowrap',
  marginRight: theme.spacing.xsmall,
}))

const HeaderActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  flexShrink: 0,
  marginLeft: 'auto',
}))

const ViewerBodySC = styled.div<{ $flush?: boolean }>(({ theme, $flush }) => ({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column',
  ...(!$flush && { padding: theme.spacing.large }),
}))

// the code card's own border and rounding double up against the panel edges
const FlushCodeSC = styled.div({
  flex: 1,
  minHeight: 0,
  '& > *': { border: 'none', borderRadius: 0 },
})

const MarkdownSC = styled.div({
  maxWidth: '56.25rem',
  width: '100%',
  margin: '0 auto',
})

const MediaSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 0,
  'img, video': {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    borderRadius: theme.borderRadiuses.medium,
  },
  audio: { width: '100%', maxWidth: 600 },
}))

const PdfSC = styled.iframe(({ theme }) => ({
  width: '100%',
  height: '100%',
  minHeight: 0,
  border: 'none',
  background: theme.colors['fill-zero'],
}))
