import {
  Button,
  Code,
  DownloadIcon,
  EmptyState,
  FileIcon,
  Flex,
  IconFrame,
  CopyIcon,
  Markdown,
  TrashCanIcon,
  useCopyText,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { FileTypeIcon } from 'components/utils/fileTree'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  useWorkbenchFileContentsQuery,
  useWorkbenchFileQuery,
  WorkbenchFileFragment,
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

// text previews come back through graphql, so anything larger is download-only
const PREVIEW_LIMIT = 1024 * 1024

export function WorkbenchFileViewer({
  workbenchId,
  path,
  onDelete,
}: {
  workbenchId: string
  path: string
  onDelete: (file: WorkbenchFileFragment) => void
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
      <CenteredSC>
        <EmptyState
          icon={<FileIcon size={40} />}
          message="File not found"
          description={path}
        />
      </CenteredSC>
    )
  if (file.kind === WorkbenchFileKind.Directory)
    return (
      <CenteredSC>
        <EmptyState
          icon={<FileIcon size={40} />}
          message="Select a file to view it"
        />
      </CenteredSC>
    )

  const downloadUrl = workbenchFileDownloadUrl(file.downloadUrl)
  const unavailable = (description: string) => (
    <CenteredSC>
      <EmptyState
        icon={<FileIcon size={40} />}
        message="Preview unavailable"
        description={description}
      >
        {downloadUrl && <DownloadButton href={downloadUrl} />}
      </EmptyState>
    </CenteredSC>
  )

  let body: ReactNode
  let flush = false
  if (isText) {
    if (tooLarge) body = unavailable('This file is too large to preview.')
    else if (contentsError && contents == null)
      body = unavailable("This file couldn't be read as text.")
    else if (contents == null && contentsLoading)
      body = (
        <RectangleSkeleton
          $height="100%"
          $width="100%"
        />
      )
    else if (viewerKind === 'markdown')
      body = (
        <MarkdownSC>
          <Markdown text={contents ?? ''} />
        </MarkdownSC>
      )
    else {
      flush = true
      body = (
        <Code
          height="100%"
          language={getLanguageFromFileName(name) ?? 'text'}
          showHeader={false}
          showLineNumbers
        >
          {contents ?? ''}
        </Code>
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
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <ViewerSC>
      <ViewerHeaderSC>
        <FileTypeIcon
          fileName={name}
          size={20}
        />
        <Flex
          direction="column"
          minWidth={0}
          flex={1}
          gap="xxxsmall"
        >
          <Body2BoldP
            css={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </Body2BoldP>
          <CaptionP
            $color="text-xlight"
            css={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {[file.sandboxPath, meta].filter(Boolean).join(' · ')}
          </CaptionP>
        </Flex>
        <HeaderActionsSC>
          <CopyPathButton path={file.sandboxPath} />
          {downloadUrl && (
            <IconFrame
              clickable
              type="tertiary"
              tooltip="Download"
              aria-label={`Download ${name}`}
              icon={<DownloadIcon />}
              as="a"
              href={downloadUrl}
            />
          )}
          <IconFrame
            clickable
            type="tertiary"
            tooltip="Delete file"
            aria-label={`Delete ${name}`}
            icon={<TrashCanIcon color="icon-danger" />}
            onClick={() => onDelete(file)}
          />
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

function CopyPathButton({ path }: { path: string }) {
  const { copied, handleCopy } = useCopyText(path, 2000)

  return (
    <IconFrame
      clickable
      type="tertiary"
      tooltip={copied ? 'Copied' : 'Copy sandbox path'}
      aria-label="Copy sandbox path"
      icon={<CopyIcon />}
      onClick={handleCopy}
    />
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
  minHeight: WORKBENCH_FILES_HEADER_HEIGHT,
  padding: `${theme.spacing.small}px ${theme.spacing.large}px`,
  borderBottom: theme.borders.default,
  flexShrink: 0,
}))

const HeaderActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  flexShrink: 0,
  marginLeft: 'auto',
}))

const ViewerBodySC = styled.div<{ $flush?: boolean }>(
  ({ theme, $flush }) => ({
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    ...($flush ? {} : { padding: theme.spacing.large }),
  })
)

const CenteredSC = styled.div({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 0,
})

const MarkdownSC = styled.div({
  maxWidth: 900,
  width: '100%',
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
