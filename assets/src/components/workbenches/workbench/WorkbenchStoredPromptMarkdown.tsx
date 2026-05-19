import { SimplifiedMarkdown } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { truncateKeepingChips } from 'components/utils/contentEditableChips'
import styled, { css } from 'styled-components'

const MarkdownWrapSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  minWidth: 0,
  wordBreak: 'break-word',
}))

const clampedMarkdownInnerStyles = ({
  theme,
  lines = 3,
}: {
  theme: any
  lines?: number
}) => css`
  margin: 0;
  min-height: 0;
  min-width: 0;
  padding: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${lines};
  line-clamp: ${lines};
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;

  /* Tighter than default block markdown so margins don't steal the line budget. */
  & > *:not(:last-child) {
    margin-bottom: ${theme.spacing.xxxsmall}px;
  }
`

/** Muted typography + line clamp (`SimplifiedMarkdown` uses `rootLayout="block"` so chips stay in-flow in `<p>`). */
const tableCellClampStyles = ({ theme }) => css`
  ${theme.partials.text.caption};
  color: ${theme.colors['text-light']};
  min-width: 0;
  overflow: hidden;

  & > div {
    ${clampedMarkdownInnerStyles({ theme })}
  }
`

const TableCellMarkdownWrapSC = styled(MarkdownWrapSC)`
  ${tableCellClampStyles}
`

const sidePanelClampStyles = ({ theme }) => css`
  ${theme.partials.text.caption};
  color: ${theme.colors['text-xlight']};
  min-width: 0;
  overflow: hidden;

  & > div {
    ${clampedMarkdownInnerStyles({ theme })}
  }
`

const SidePanelMarkdownWrapSC = styled(MarkdownWrapSC)`
  ${sidePanelClampStyles}
`

const jobCardClampStyles = ({
  theme,
  lines = 3,
}: {
  theme: any
  lines?: number
}) => css`
  ${theme.partials.text.body2};
  color: ${theme.colors['text-light']};
  min-width: 0;
  overflow: hidden;

  & > div {
    ${clampedMarkdownInnerStyles({ theme, lines })}
  }
`

const JobCardMarkdownWrapSC = styled(MarkdownWrapSC)<{ $lines: number }>`
  ${({ theme, $lines }) => jobCardClampStyles({ theme, lines: $lines })}
`

/**
 * Renders a stored workbench prompt (serialized `plrl-*` chip XML) with the same
 * markdown + inline chip treatment as job activity user messages.
 */
export function WorkbenchStoredPromptMarkdown({
  text,
  truncateVisibleChars,
  density = 'default',
  clampLines = 3,
}: {
  text: string
  /** When set, trims by visible length without splitting chips (like job previews). */
  truncateVisibleChars?: number
  /** `tableCell`: caption + `text-light` + ~3-line max height (cron table). `sidePanel`: caption + `text-xlight` + same clamp (workbench sidebar crons). `jobCard`: body2 + `text-light` + same clamp (home recent jobs). */
  density?: 'default' | 'tableCell' | 'sidePanel' | 'jobCard'
  /** Number of lines before truncation when density is `jobCard`. Default 3. */
  clampLines?: number
}) {
  const clampedDensity =
    density === 'tableCell' || density === 'sidePanel' || density === 'jobCard'

  const trimmed =
    truncateVisibleChars != null && !clampedDensity
      ? truncateKeepingChips(text, truncateVisibleChars)
      : text

  if (density === 'tableCell') {
    return (
      <TableCellMarkdownWrapSC>
        <SimplifiedMarkdown
          text={trimmed}
          rootLayout="block"
        />
      </TableCellMarkdownWrapSC>
    )
  }
  if (density === 'sidePanel') {
    return (
      <SidePanelMarkdownWrapSC>
        <SimplifiedMarkdown
          text={trimmed}
          rootLayout="block"
        />
      </SidePanelMarkdownWrapSC>
    )
  }
  if (density === 'jobCard') {
    return (
      <JobCardMarkdownWrapSC $lines={clampLines}>
        <SimplifiedMarkdown
          text={trimmed}
          rootLayout="block"
        />
      </JobCardMarkdownWrapSC>
    )
  }

  return (
    <MarkdownWrapSC>
      <SimplifiedMarkdown
        text={trimmed}
        rootLayout="block"
      />
    </MarkdownWrapSC>
  )
}
