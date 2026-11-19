import {
  Button,
  CaretDownIcon,
  CaretRightIcon,
  Chip,
  FileIcon,
  IconFrame,
  ReloadIcon,
} from '@pluralsh/design-system'
import { AgentRunPatchView } from 'components/ai/agent-runs/details/AgentRunPatchView'
import { GqlError } from 'components/utils/Alert'
import { TRUNCATE_LEFT } from 'components/utils/truncate'
import { CaptionP } from 'components/utils/typography/Text'
import pluralize from 'pluralize'
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'
import { DevboxUnavailable } from './DevboxUnavailable'
import {
  DevboxChangedFile,
  DevboxChangeGroup,
  DevboxWorkspaceApi,
} from './devboxWorkspaceApi'

const DIFFSTAT_BOXES = 5

export function DevboxDiffTab({
  api,
  live,
  onOpen,
}: {
  api: DevboxWorkspaceApi
  live: boolean
  onOpen: (path: string) => void
}) {
  const { changes } = api
  const [groups, setGroups] = useState<Nullable<DevboxChangeGroup[]>>(null)
  const [error, setError] = useState<Nullable<Error>>(null)
  const [refreshing, setRefreshing] = useState(false)
  const load = useCallback(
    () =>
      changes?.()
        .then((g) => {
          setGroups(g)
          setError(null)
        })
        .catch(setError),
    [changes]
  )
  useEffect(() => {
    if (live) load()
  }, [live, load])
  const refresh = () => {
    setRefreshing(true)
    load()?.finally(() => setRefreshing(false))
  }

  if (!changes)
    return (
      <DevboxUnavailable
        title="Changes unavailable"
        message="Console doesn't serve devbox changes yet (devboxChanges)."
      />
    )
  if (!live)
    return (
      <DevboxUnavailable
        title="Instance isn't running"
        message="Resume the instance to see its changes."
      />
    )

  const changed = (groups ?? []).filter((g) => g.files.length)
  const files = changed.flatMap((g) => g.files)
  const totals = files.reduce(
    (acc, f) => ({
      additions: acc.additions + (f.additions ?? 0),
      deletions: acc.deletions + (f.deletions ?? 0),
    }),
    { additions: 0, deletions: 0 }
  )

  return (
    <WrapperSC>
      <SummarySC>
        <span>
          {groups
            ? `${files.length} ${pluralize('file', files.length)} changed`
            : 'Loading changes…'}
        </span>
        {!!files.length && <DiffStat {...totals} />}
        <Button
          small
          tertiary
          startIcon={<ReloadIcon />}
          loading={refreshing}
          onClick={refresh}
          css={{ marginLeft: 'auto' }}
        >
          Refresh
        </Button>
      </SummarySC>
      {error && <GqlError error={error} />}
      {groups && !files.length && (
        <CaptionP $color="text-xlight">No uncommitted changes.</CaptionP>
      )}
      {changed.map((group) => (
        <GroupSC key={group.repository}>
          {changed.length > 1 && (
            <GroupHeaderSC>
              <strong>{group.repository}</strong>
              {group.branch && <Chip size="small">{group.branch}</Chip>}
            </GroupHeaderSC>
          )}
          {group.files.map((file) => (
            <DiffFileCard
              key={file.path}
              file={file}
              onOpen={() =>
                onOpen(group.path ? `${group.path}/${file.path}` : file.path)
              }
            />
          ))}
        </GroupSC>
      ))}
    </WrapperSC>
  )
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
      {open &&
        (file.binary ? (
          <CardNoteSC>Binary file not shown.</CardNoteSC>
        ) : file.patch ? (
          <AgentRunPatchView patch={file.patch} />
        ) : (
          <CardNoteSC>No diff available.</CardNoteSC>
        ))}
    </CardSC>
  )
}

// GitHub's counts plus five boxes split by the share of added lines
function DiffStat({
  additions,
  deletions,
}: {
  additions: number
  deletions: number
}) {
  const total = additions + deletions
  const added = total ? Math.round((additions / total) * DIFFSTAT_BOXES) : 0
  const deleted = total ? DIFFSTAT_BOXES - added : 0
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

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.medium,
}))

const SummarySC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  color: theme.colors['text-light'],
}))

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

const CardNoteSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  padding: theme.spacing.medium,
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
