import { SimplifiedMarkdown } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import type { SemanticColorKey } from '@pluralsh/design-system'
import { truncateKeepingChips } from 'components/utils/contentEditableChips'
import { RefObject, useLayoutEffect, useRef, useState } from 'react'
import styled, { css } from 'styled-components'

// Whether the clamped element `getClamped` returns cuts its content off,
// re-checked whenever `ref`'s element resizes (e.g. a panel opening changes the
// width, and so the wrapping) or `content` changes.
export function useClampOverflow(
  ref: RefObject<HTMLElement | null>,
  getClamped: (el: HTMLElement) => Element | null,
  content: unknown,
  enabled = true
) {
  const [overflowing, setOverflowing] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!enabled || !el) return

    const check = () => {
      const clamped = getClamped(el)
      setOverflowing(
        !!clamped && clamped.scrollHeight > clamped.clientHeight + 1
      )
    }

    check()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(check)
    observer.observe(el)

    return () => observer.disconnect()
  }, [content, enabled, getClamped, ref])

  return overflowing
}

// the markdown root, which the clamped densities clamp (see `& > div` below)
const getClampedMarkdown = (wrapper: HTMLElement) => wrapper.firstElementChild

const MarkdownWrapSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  minWidth: 0,
  wordBreak: 'break-word',
}))

// `lines: null` keeps the compact layout without clamping.
const clampedMarkdownInnerStyles = ({
  theme,
  lines = 3,
}: {
  theme: any
  lines?: number | null
}) => css`
  margin: 0;
  min-height: 0;
  min-width: 0;
  padding: 0;
  word-break: break-word;
  ${
    lines !== null &&
    css`
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: ${lines};
      line-clamp: ${lines};
      overflow: hidden;
      text-overflow: ellipsis;
    `
  }

  /* Tighter than default block markdown so margins don't steal the line budget. */
  & > *:not(:last-child) {
    margin-bottom: ${theme.spacing.xxxsmall}px;
  }
`

/** Muted typography + line clamp (`SimplifiedMarkdown` uses `rootLayout="block"` so chips stay in-flow in `<p>`). */
const tableCellClampStyles = ({
  theme,
  lines = 3,
}: {
  theme: any
  lines?: number | null
}) => css`
  ${theme.partials.text.caption};
  color: ${theme.colors['text-light']};
  min-width: 0;
  overflow: hidden;

  & > div {
    ${clampedMarkdownInnerStyles({ theme, lines })}
  }
`

const TableCellMarkdownWrapSC = styled(MarkdownWrapSC)<{
  $lines: number | null
}>`
  ${({ theme, $lines }) => tableCellClampStyles({ theme, lines: $lines })}
`

const sidePanelClampStyles = ({
  theme,
  lines = 3,
}: {
  theme: any
  lines?: number | null
}) => css`
  ${theme.partials.text.caption};
  color: ${theme.colors['text-xlight']};
  min-width: 0;
  overflow: hidden;

  & > div {
    ${clampedMarkdownInnerStyles({ theme, lines })}
  }
`

const SidePanelMarkdownWrapSC = styled(MarkdownWrapSC)<{
  $lines: number | null
}>`
  ${({ theme, $lines }) => sidePanelClampStyles({ theme, lines: $lines })}
`

const jobCardClampStyles = ({
  theme,
  lines = 3,
  promptColor = 'text-light',
}: {
  theme: any
  lines?: number | null
  promptColor?: SemanticColorKey
}) => css`
  ${theme.partials.text.body2};
  color: ${theme.colors[promptColor]};
  min-width: 0;
  overflow: hidden;

  & > div {
    ${clampedMarkdownInnerStyles({ theme, lines })}
  }
`

const JobCardMarkdownWrapSC = styled(MarkdownWrapSC)<{
  $lines: number | null
  $promptColor?: SemanticColorKey
}>`
  ${({ theme, $lines, $promptColor = 'text-light' }) =>
    jobCardClampStyles({ theme, lines: $lines, promptColor: $promptColor })}
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
  promptColor = 'text-light',
  onOverflowChange,
}: {
  text: string
  /** When set, trims by visible length without splitting chips (like job previews). */
  truncateVisibleChars?: number
  /** `tableCell`: caption + `text-light` + ~3-line max height (cron table). `sidePanel`: caption + `text-xlight` + same clamp (workbench sidebar crons). `jobCard`: body2 + `text-light` + same clamp (home recent jobs). */
  density?: 'default' | 'tableCell' | 'sidePanel' | 'jobCard'
  /** Number of lines before truncation for the clamped densities. Default 3; `null` disables clamping. */
  clampLines?: number | null
  promptColor?: SemanticColorKey
  /** Reports whether the clamp cuts the text off, as the width or text change. */
  onOverflowChange?: (overflowing: boolean) => void
}) {
  const clampedDensity = density !== 'default'
  const wrapperRef = useRef<HTMLDivElement>(null)
  const overflowing = useClampOverflow(
    wrapperRef,
    getClampedMarkdown,
    `${text}:${clampLines}`,
    !!onOverflowChange && clampedDensity && clampLines !== null
  )

  useLayoutEffect(() => {
    onOverflowChange?.(overflowing)
  }, [onOverflowChange, overflowing])

  const trimmed =
    truncateVisibleChars != null && !clampedDensity
      ? truncateKeepingChips(text, truncateVisibleChars)
      : text

  if (density === 'tableCell') {
    return (
      <TableCellMarkdownWrapSC
        ref={wrapperRef}
        $lines={clampLines}
      >
        <SimplifiedMarkdown
          text={trimmed}
          rootLayout="block"
        />
      </TableCellMarkdownWrapSC>
    )
  }
  if (density === 'sidePanel') {
    return (
      <SidePanelMarkdownWrapSC
        ref={wrapperRef}
        $lines={clampLines}
      >
        <SimplifiedMarkdown
          text={trimmed}
          rootLayout="block"
        />
      </SidePanelMarkdownWrapSC>
    )
  }
  if (density === 'jobCard') {
    return (
      <JobCardMarkdownWrapSC
        ref={wrapperRef}
        $lines={clampLines}
        $promptColor={promptColor}
      >
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
