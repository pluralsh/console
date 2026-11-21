import {
  Button,
  CaretDownIcon,
  CaretRightIcon,
  Chip,
  CloseIcon,
  GitCompareIcon,
  FileIcon,
  IconFrame,
  ReloadIcon,
} from '@pluralsh/design-system'
import { AgentRunPatchView } from 'components/ai/agent-runs/details/AgentRunPatchView'
import { GqlError } from 'components/utils/Alert'
import { FileTypeIcon } from 'components/utils/fileTree'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { TRUNCATE_LEFT } from 'components/utils/truncate'
import { CaptionP } from 'components/utils/typography/Text'
import { PathBreadcrumb } from 'components/workbenches/workbench/files/WorkbenchFileViewer'
import pluralize from 'pluralize'
import { ReactNode, useState } from 'react'
import styled from 'styled-components'
import { basename } from '../files/workbenchFilePaths'
import {
  ALL_CHANGES,
  changeKey,
  findChange,
  useDevboxChanges,
} from './devboxChanges'
import { DevboxChangedFile } from './devboxWorkspaceApi'

const DIFFSTAT_BOXES = 5

// the main view for a change picked in the changes tab: one file's diff, or every diff
export function DevboxChangesViewer({
  instanceId,
  change,
  onOpenFile,
  onClose,
}: {
  instanceId: string
  change: string
  onOpenFile: (path: string) => void
  onClose: () => void
}) {
  const { groups, error, loading, refetch } = useDevboxChanges(instanceId, true)
  const all = change === ALL_CHANGES
  const selected = all ? null : findChange(groups, change)
  const files = (groups ?? []).flatMap((g) => g.files)
  const totals = all ? sumStats(files) : selected && sumStats([selected.file])

  let body: ReactNode
  if (error && !groups)
    body = (
      <PaddedSC>
        <GqlError error={error} />
      </PaddedSC>
    )
  else if (!groups)
    body = (
      <RectangleSkeleton
        $height="100%"
        $width="100%"
      />
    )
  else if (all)
    body = files.length ? (
      <ListSC>
        {groups.map((group) => (
          <GroupSC key={group.path ?? group.repository}>
            {groups.length > 1 && (
              <GroupHeaderSC>
                <strong>{group.repository}</strong>
                {group.branch && <Chip size="small">{group.branch}</Chip>}
              </GroupHeaderSC>
            )}
            {group.files.map((file) => (
              <DiffFileCard
                key={file.path}
                file={file}
                onOpen={() => onOpenFile(changeKey(group, file))}
              />
            ))}
          </GroupSC>
        ))}
      </ListSC>
    ) : (
      <PaddedSC>
        <CaptionP $color="text-xlight">No uncommitted changes.</CaptionP>
      </PaddedSC>
    )
  else if (!selected)
    body = (
      <PaddedSC>
        <CaptionP $color="text-xlight">
          This file no longer has uncommitted changes.
        </CaptionP>
      </PaddedSC>
    )
  else body = <FileDiffBody file={selected.file} />

  return (
    <ViewerSC>
      <ViewerHeaderSC>
        {all ? (
          <>
            <GitCompareIcon size={16} />
            <TitleSC>All changes</TitleSC>
            {groups && (
              <CaptionP $color="text-xlight">
                {files.length} {pluralize('file', files.length)}
              </CaptionP>
            )}
          </>
        ) : (
          <>
            <FileTypeIcon
              fileName={basename(change)}
              size={20}
            />
            <PathBreadcrumb path={change} />
            {selected?.file.oldPath && (
              <CaptionP $color="text-xlight">
                from {selected.file.oldPath}
              </CaptionP>
            )}
          </>
        )}
        <HeaderActionsSC>
          {totals && <DiffStat {...totals} />}
          <Button
            small
            tertiary
            startIcon={<ReloadIcon />}
            loading={loading && !!groups}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          {selected && selected.file.status !== 'deleted' && (
            <IconFrame
              clickable
              icon={<FileIcon />}
              onClick={() => onOpenFile(change)}
              tooltip="Open file"
            />
          )}
          <IconFrame
            clickable
            aria-label="Close changes"
            icon={<CloseIcon />}
            onClick={onClose}
            tooltip="Close"
          />
        </HeaderActionsSC>
      </ViewerHeaderSC>
      <ViewerBodySC>{body}</ViewerBodySC>
    </ViewerSC>
  )
}

function FileDiffBody({ file }: { file: DevboxChangedFile }) {
  if (file.binary)
    return (
      <PaddedSC>
        <CaptionP $color="text-xlight">Binary file not shown.</CaptionP>
      </PaddedSC>
    )
  if (!file.patch)
    return (
      <PaddedSC>
        <CaptionP $color="text-xlight">No diff available.</CaptionP>
      </PaddedSC>
    )
  return <AgentRunPatchView patch={file.patch} />
}

function DiffFileCard({
  file,
  onOpen,
}: {
  file: DevboxChangedFile
  onOpen: () => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <CardSC>
      <CardHeaderSC>
        <IconFrame
          clickable
          size="small"
          icon={open ? <CaretDownIcon /> : <CaretRightIcon />}
          tooltip={open ? 'Collapse' : 'Expand'}
          onClick={() => setOpen((o) => !o)}
        />
        <FileTypeIcon
          fileName={basename(file.path)}
          size={16}
        />
        <FilePathSC title={file.path}>
          {file.oldPath ? `${file.oldPath} → ${file.path}` : file.path}
        </FilePathSC>
        {file.status && <StatusSC>{file.status}</StatusSC>}
        <DiffStat
          additions={file.additions ?? 0}
          deletions={file.deletions ?? 0}
        />
        <IconFrame
          clickable
          size="small"
          icon={<FileIcon />}
          tooltip="Open file"
          onClick={onOpen}
        />
      </CardHeaderSC>
      {open && <FileDiffBody file={file} />}
    </CardSC>
  )
}

const sumStats = (files: DevboxChangedFile[]) =>
  files.reduce(
    (acc, f) => ({
      additions: acc.additions + (f.additions ?? 0),
      deletions: acc.deletions + (f.deletions ?? 0),
    }),
    { additions: 0, deletions: 0 }
  )

// GitHub's boxes: one per line under five lines, otherwise each side's floored share, the rest neutral
export function diffStatBoxes(additions: number, deletions: number) {
  const total = additions + deletions
  if (total < DIFFSTAT_BOXES) return { added: additions, deleted: deletions }
  return {
    added: Math.floor((additions / total) * DIFFSTAT_BOXES),
    deleted: Math.floor((deletions / total) * DIFFSTAT_BOXES),
  }
}

export function DiffStat({
  additions,
  deletions,
}: {
  additions: number
  deletions: number
}) {
  const { added, deleted } = diffStatBoxes(additions, deletions)
  return (
    <DiffStatSC>
      <AdditionsSC>+{additions}</AdditionsSC>
      <DeletionsSC>−{deletions}</DeletionsSC>
      <BoxesSC aria-hidden>
        {Array.from({ length: DIFFSTAT_BOXES }, (_, i) => (
          <BoxSC
            key={i}
            $kind={i < added ? 'add' : i < added + deleted ? 'delete' : 'none'}
          />
        ))}
      </BoxesSC>
    </DiffStatSC>
  )
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

const TitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  color: theme.colors.text,
}))

const HeaderActionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  flexShrink: 0,
  marginLeft: 'auto',
}))

const ViewerBodySC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
})

const ListSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.large,
}))

const PaddedSC = styled.div(({ theme }) => ({ padding: theme.spacing.large }))

const GroupSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
}))

const GroupHeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
}))

const CardSC = styled.div(({ theme }) => ({
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.large,
  overflow: 'hidden',
  flexShrink: 0,
}))

const CardHeaderSC = styled.div(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  padding: `${theme.spacing.xxsmall} ${theme.spacing.small}`,
  backgroundColor: theme.colors['fill-one'],
  borderBottom: theme.borders.default,
}))

const FilePathSC = styled.span(({ theme }) => ({
  ...theme.partials.text.code,
  ...TRUNCATE_LEFT,
  flex: 1,
  minWidth: 0,
  fontSize: '0.8125rem',
  color: theme.colors.text,
}))

const StatusSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  flexShrink: 0,
  color: theme.colors['text-xlight'],
}))

const DiffStatSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  flexShrink: 0,
}))

const AdditionsSC = styled.span(({ theme }) => ({
  color: theme.colors['text-success'],
}))

const DeletionsSC = styled.span(({ theme }) => ({
  color: theme.colors['text-danger'],
}))

const BoxesSC = styled.span({ display: 'inline-flex', gap: 1 })

const BoxSC = styled.span<{ $kind: 'add' | 'delete' | 'none' }>(
  ({ theme, $kind }) => ({
    width: 8,
    height: 8,
    borderRadius: 1,
    backgroundColor:
      $kind === 'add'
        ? theme.colors['icon-success']
        : $kind === 'delete'
          ? theme.colors['icon-danger']
          : theme.colors.border,
  })
)
