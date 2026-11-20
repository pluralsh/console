import { Card, DiffViewer } from '@pluralsh/design-system'
import { FileTypeIcon } from 'components/utils/fileTree'
import { TRUNCATE_LEFT } from 'components/utils/truncate'
import { diffLines } from 'diff'
import { ReactNode, useMemo } from 'react'
import styled from 'styled-components'
import { basename } from '../files/workbenchFilePaths'
import { DiffStat } from './DevboxChangesViewer'
import { ApprovalDiff } from './devboxApprovals'

// a file edit as a code block: file type and path in the header, the diff as its body
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
  return (
    <Card
      fillLevel={2}
      css={{ overflow: 'hidden' }}
      data-content="diff"
    >
      <HeaderSC>
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

const HeaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  minHeight: theme.spacing.large,
  padding: `${theme.spacing.xsmall} ${theme.spacing.small}`,
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['fill-one']
      : theme.colors['fill-three'],
  borderBottom: theme.borders['fill-three'],
  color: theme.colors['text-light'],
}))

const PathSC = styled.span({
  ...TRUNCATE_LEFT,
  flex: 1,
  minWidth: 0,
})

const BodySC = styled.div({ maxHeight: 420, overflow: 'auto' })
