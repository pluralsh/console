import {
  Card,
  DiffViewer,
  FillLevel,
  toFillLevel,
  useFillLevel,
} from '@pluralsh/design-system'
import { FileTypeIcon } from 'components/utils/fileTree'
import { TRUNCATE_LEFT } from 'components/utils/truncate'
import { diffLines } from 'diff'
import { ReactNode, useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { basename } from '../files/workbenchFilePaths'
import { DiffStat } from './DevboxChangesViewer'
import { ApprovalDiff } from './devboxApprovals'

// a file edit as a code block: file type and path in the header, the diff as its body.
// fills follow the design system's Code so both read the same in either mode
export function DevboxFileDiff({
  diff,
  status,
}: {
  diff: ApprovalDiff
  status?: ReactNode
}) {
  const { additions, deletions } = useMemo(
    () => countChanges(diff.oldText, diff.newText),
    [diff.oldText, diff.newText]
  )
  const theme = useTheme()
  const parentFill = useFillLevel()
  return (
    <Card
      fillLevel={
        theme.mode === 'light' ? 1 : toFillLevel(Math.min(parentFill + 1, 2))
      }
      css={{
        overflow: 'hidden',
        borderColor:
          parentFill >= 1
            ? theme.colors['border-fill-three']
            : theme.colors['border-fill-two'],
      }}
      data-content="diff"
    >
      <HeaderSC $parentFill={parentFill}>
        <FileTypeIcon
          fileName={basename(diff.path) || diff.path}
          size={14}
        />
        <PathSC title={diff.path}>{diff.path || 'Untitled'}</PathSC>
        {status}
        <DiffStat
          additions={additions}
          deletions={deletions}
        />
      </HeaderSC>
      <BodySC>
        <DiffViewer
          asCard={false}
          oldValue={diff.oldText}
          newValue={diff.newText}
          splitView={false}
          extraLinesSurroundingDiff={3}
        />
      </BodySC>
    </Card>
  )
}

export function countChanges(oldText: string, newText: string) {
  let additions = 0
  let deletions = 0
  for (const change of diffLines(oldText, newText)) {
    if (change.added) additions += change.count ?? 0
    else if (change.removed) deletions += change.count ?? 0
  }
  return { additions, deletions }
}

const HeaderSC = styled.div<{ $parentFill: FillLevel }>(
  ({ theme, $parentFill }) => ({
    ...theme.partials.text.caption,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xsmall,
    minHeight: theme.spacing.large,
    padding: `${theme.spacing.xsmall} ${theme.spacing.small}`,
    backgroundColor:
      theme.mode === 'light'
        ? theme.colors['fill-one']
        : $parentFill >= 1
          ? theme.colors['fill-three']
          : theme.colors['fill-two'],
    borderBottom:
      $parentFill >= 1
        ? theme.borders['fill-three']
        : theme.borders['fill-two'],
    color: theme.colors['text-light'],
  })
)

const PathSC = styled.span({
  ...TRUNCATE_LEFT,
  flex: 1,
  minWidth: 0,
})

const BodySC = styled.div({ maxHeight: 420, overflow: 'auto' })
