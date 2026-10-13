import {
  Button,
  DownloadIcon,
  Flex,
  Spinner,
  Tooltip,
} from '@pluralsh/design-system'
import { FileTypeIcon } from 'components/utils/fileTree'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  basename,
  toWorkbenchPath,
  workbenchFileDownloadUrl,
} from 'components/workbenches/workbench/files/workbenchFilePaths'
import { useWorkbenchFileQuery } from 'generated/graphql'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { ExtraProps } from 'react-markdown'
import { getWorkbenchFilesAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { formatFileSize } from 'utils/file'
import { ChipBody, ChipLinkSC } from './input/autocomplete/PlrlChipMdRenderers'

// agents reference workbench files in their output with
// <plrl-file path="/workbench/..." description="..."></plrl-file>
export const PLRL_FILE_TAG = 'plrl-file'

// avoids `id`/`name`, which rehype-sanitize clobbers with a `user-content-` prefix
export const PLRL_FILE_ATTRIBUTES = ['path', 'description']

// the workbench file references resolve against, unset outside a workbench
export const WorkbenchFileContext = createContext<Nullable<string>>(null)

const CLOSE_DELAY = 150

type PlrlFileChipProps = {
  path?: string
  description?: string
  children?: ReactNode
} & ExtraProps

export function PlrlFileChip({
  path,
  description,
  children,
}: PlrlFileChipProps) {
  const workbenchId = useContext(WorkbenchFileContext)
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }, [])
  const show = useCallback(() => {
    cancelClose()
    setOpen(true)
  }, [cancelClose])
  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY)
  }, [cancelClose])

  useEffect(() => cancelClose, [cancelClose])

  if (!path) return <>{children}</>

  const filePath = toWorkbenchPath(path)
  const label = hasText(children) ? children : basename(filePath)
  const chip = (
    <ChipBody
      icon={
        <FileTypeIcon
          fileName={basename(filePath)}
          size={12}
        />
      }
    >
      {label}
    </ChipBody>
  )

  return (
    <Tooltip
      displayOn="manual"
      manualOpen={open}
      placement="top"
      css={{ pointerEvents: 'auto', userSelect: 'text', maxWidth: 420 }}
      label={
        <div
          onMouseEnter={show}
          onMouseLeave={scheduleClose}
        >
          <FileTooltipContent
            workbenchId={workbenchId}
            path={filePath}
            description={description}
            enabled={open}
          />
        </div>
      }
    >
      <span
        onMouseEnter={show}
        onMouseLeave={scheduleClose}
        onFocus={show}
        onBlur={scheduleClose}
      >
        {workbenchId ? (
          <ChipLinkSC to={getWorkbenchFilesAbsPath(workbenchId, filePath)}>
            {chip}
          </ChipLinkSC>
        ) : (
          chip
        )}
      </span>
    </Tooltip>
  )
}

export const plrlFileChipComponents = { [PLRL_FILE_TAG]: PlrlFileChip }

function FileTooltipContent({
  workbenchId,
  path,
  description,
  enabled,
}: {
  workbenchId: Nullable<string>
  path: string
  description?: string
  enabled: boolean
}) {
  const { data, loading, error } = useWorkbenchFileQuery({
    variables: { id: workbenchId ?? '', path },
    skip: !workbenchId || !enabled,
    fetchPolicy: 'cache-and-network',
  })
  const file = data?.workbench?.file
  const downloadUrl = workbenchFileDownloadUrl(file?.downloadUrl)
  const details = [
    formatFileSize(file?.size),
    file?.modifiedAt && `modified ${formatDateTime(file.modifiedAt)}`,
  ].filter(Boolean)

  return (
    <Flex
      direction="column"
      gap="xsmall"
      css={{ padding: 2, minWidth: 200 }}
    >
      <Flex
        align="center"
        gap="xsmall"
        minWidth={0}
      >
        <FileTypeIcon
          fileName={file?.name ?? basename(path)}
          size={16}
        />
        <Body2BoldP css={{ overflowWrap: 'anywhere', minWidth: 0 }}>
          {file?.name ?? basename(path)}
        </Body2BoldP>
      </Flex>
      {description && <TooltipTextSC>{description}</TooltipTextSC>}
      <CaptionP
        $color="text-xlight"
        css={{ overflowWrap: 'anywhere' }}
      >
        {file?.sandboxPath ?? path}
      </CaptionP>
      {workbenchId &&
        (!file && loading ? (
          <Flex
            align="center"
            gap="xsmall"
          >
            <Spinner size={12} />
            <CaptionP $color="text-xlight">Loading details…</CaptionP>
          </Flex>
        ) : error && !file ? (
          <CaptionP $color="text-danger-light">
            This file is no longer available.
          </CaptionP>
        ) : (
          <Flex
            align="center"
            justify="space-between"
            gap="small"
          >
            <CaptionP $color="text-xlight">{details.join(' · ') || '—'}</CaptionP>
            {downloadUrl && (
              <Button
                small
                secondary
                as="a"
                href={downloadUrl}
                startIcon={<DownloadIcon />}
                onClick={(e) => e.stopPropagation()}
              >
                Download
              </Button>
            )}
          </Flex>
        ))}
    </Flex>
  )
}

function hasText(children: ReactNode): boolean {
  if (typeof children === 'string') return children.trim().length > 0
  if (Array.isArray(children)) return children.some(hasText)
  return children != null && typeof children !== 'boolean'
}

const TooltipTextSC = styled.p(({ theme }) => ({
  ...theme.partials.text.caption,
  margin: 0,
  color: theme.colors['text-light'],
  overflowWrap: 'break-word',
}))
