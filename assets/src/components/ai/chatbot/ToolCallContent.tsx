import {
  Button,
  ButtonProps,
  Card,
  Code,
  Flex,
  Markdown,
} from '@pluralsh/design-system'
import { ChatTypeAttributes } from 'generated/graphql'
import isJson from 'is-json'
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { prettifyToolJson } from './toolCallDisplay'

enum ToolCallTab {
  Arguments = 'arguments',
  Response = 'response',
}

export function useSlimToolCodeCss() {
  const { colors } = useTheme()
  return {
    overflow: 'auto',
    minHeight: 0,
    '& > div > div:first-child': {
      minHeight: 36,
      padding: 8,
      color: colors['text-light'],
    },
  } as const
}

const RUNNING_DOTS = ['', '.', '..', '...'] as const

/** Response Code card with animated "running" / "running." / "running.." / "running...". */
export function RunningToolOutputCode({
  fillLevel,
  showHeader = true,
}: {
  fillLevel?: 0 | 1 | 2 | 3
  showHeader?: boolean
}) {
  const slimCodeCss = useSlimToolCodeCss()
  const [dotIndex, setDotIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setDotIndex((index) => (index + 1) % RUNNING_DOTS.length)
    }, 500)
    return () => window.clearInterval(id)
  }, [])

  return (
    <Code
      fillLevel={fillLevel}
      title={showHeader ? 'Response' : undefined}
      showHeader={showHeader}
      css={slimCodeCss}
    >
      {`running${RUNNING_DOTS[dotIndex]}`}
    </Code>
  )
}

export function ToolCallContent({
  content,
  attributes,
  customResultBody,
  hideArguments = false,
  isPending,
  /** When true (e.g. inside a modal), skip clamp / Show more — full content scrolls in place. */
  unclamped = false,
}: {
  content: string
  attributes: Nullable<ChatTypeAttributes>
  customResultBody?: ReactNode
  hideArguments?: boolean
  isPending?: boolean
  unclamped?: boolean
}) {
  const { spacing } = useTheme()
  const slimCodeCss = useSlimToolCodeCss()

  const showArguments = !hideArguments && !!attributes?.tool?.arguments
  const hasResponse = !!(isPending || customResultBody || content)
  const showTabs = showArguments && hasResponse

  const [tab, setTab] = useState<ToolCallTab>(() =>
    hasResponse ? ToolCallTab.Response : ToolCallTab.Arguments
  )

  useEffect(() => {
    if (!showTabs) return
    if (!hasResponse && tab === ToolCallTab.Response) {
      setTab(ToolCallTab.Arguments)
    }
    if (!showArguments && tab === ToolCallTab.Arguments) {
      setTab(ToolCallTab.Response)
    }
  }, [hasResponse, showArguments, showTabs, tab])

  const showingArguments =
    showArguments && (!showTabs || tab === ToolCallTab.Arguments)
  const showingResponse =
    hasResponse && (!showTabs || tab === ToolCallTab.Response)

  const codeCss = {
    ...slimCodeCss,
    ...(unclamped && { maxHeight: '70vh', overflow: 'auto' as const }),
  }

  const plainResponse = (
    <Markdown
      text={content}
      css={{ whiteSpace: 'pre-line' }}
    />
  )

  return (
    <Flex
      direction="column"
      gap="xsmall"
      width="100%"
      minHeight={0}
      marginTop={spacing.xsmall}
    >
      {showTabs && (
        <SegmentedControlCardSC>
          <SegmentedControlBtn
            active={tab === ToolCallTab.Arguments}
            onClick={() => setTab(ToolCallTab.Arguments)}
          >
            Arguments
          </SegmentedControlBtn>
          <SegmentedControlBtn
            active={tab === ToolCallTab.Response}
            onClick={() => setTab(ToolCallTab.Response)}
          >
            Response
          </SegmentedControlBtn>
        </SegmentedControlCardSC>
      )}

      {showingArguments && (
        <Code
          language="json"
          showHeader={false}
          css={codeCss}
        >
          {prettifyToolJson(
            JSON.stringify(attributes?.tool?.arguments ?? null)
          )}
        </Code>
      )}

      {showingResponse && (
        <Flex
          direction="column"
          minWidth={0}
          width="100%"
        >
          {isPending ? (
            <RunningToolOutputCode
              showHeader={false}
              fillLevel={2}
            />
          ) : customResultBody ? (
            customResultBody
          ) : isJson(content) ? (
            <Code
              language="json"
              showHeader={false}
              css={codeCss}
            >
              {prettifyToolJson(content)}
            </Code>
          ) : unclamped ? (
            <ModalPlainBodySC>{plainResponse}</ModalPlainBodySC>
          ) : (
            <PreviewablePanel contentKey={`resp:${content.length}:plain`}>
              {plainResponse}
            </PreviewablePanel>
          )}
        </Flex>
      )}
    </Flex>
  )
}

/** Boxed preview panel: content clamps on whole lines; Show more sits inside the box. */
export function PreviewablePanel({
  children,
  contentKey,
  header,
}: {
  children: ReactNode
  contentKey: string
  /** Optional in-frame header (e.g. "Prompt"), matching Cursor-style tool boxes. */
  header?: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setExpanded(false)
  }, [contentKey])

  useLayoutEffect(() => {
    const element = contentRef.current
    if (!element) return

    const updateCanExpand = () => {
      const nextCanExpand = element.scrollHeight > element.clientHeight + 1
      setCanExpand((prev) => {
        // Keep the control visible while expanded even if scrollHeight shrinks to fit.
        const next = expanded ? prev || nextCanExpand : nextCanExpand
        return prev === next ? prev : next
      })
    }

    updateCanExpand()

    const resizeObserver = new ResizeObserver(updateCanExpand)
    resizeObserver.observe(element)

    return () => resizeObserver.disconnect()
  }, [contentKey, expanded])

  return (
    <PreviewBoxSC>
      {header != null && <PreviewHeaderSC>{header}</PreviewHeaderSC>}
      <PreviewContentSC
        ref={contentRef}
        $expanded={expanded}
        $flushBottom={canExpand}
        $fade={!expanded && canExpand}
      >
        {children}
      </PreviewContentSC>
      {canExpand && (
        <ShowMoreSC
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </ShowMoreSC>
      )}
    </PreviewBoxSC>
  )
}

const SegmentedControlCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xxsmall,
  padding: theme.spacing.xxsmall,
  background: 'transparent',
  width: 'fit-content',
}))

function SegmentedControlBtn({
  active,
  ...props
}: { active: boolean } & ButtonProps) {
  const { spacing } = useTheme()
  return (
    <Button
      small
      css={{ padding: `0 ${spacing.xsmall}px`, minHeight: 24 }}
      style={{ ...(active && { pointerEvents: 'none', cursor: 'default' }) }}
      floating={active}
      tertiary={!active}
      {...props}
    />
  )
}

const PreviewBoxSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  minHeight: 0,
  overflow: 'hidden',
  border: theme.borders['fill-two'],
  borderRadius: theme.borderRadiuses.medium,
  backgroundColor: theme.colors['fill-two'],
}))

/** Full plain-text body inside a tool modal (no clamp / Show more). */
const ModalPlainBodySC = styled.div(({ theme }) => ({
  maxHeight: '70vh',
  overflow: 'auto',
  padding: theme.spacing.small,
  border: theme.borders['fill-two'],
  borderRadius: theme.borderRadiuses.medium,
  backgroundColor: theme.colors['fill-two'],
  color: theme.colors['text-long-form'],
  fontSize: theme.partials.text.body2.fontSize,
  lineHeight: 1.45,
}))

const PreviewHeaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  flexShrink: 0,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
  color: theme.colors['text-xlight'],
  backgroundColor: theme.colors['fill-one'],
  borderBottom: theme.borders['fill-two'],
}))

const PreviewContentSC = styled.div<{
  $expanded: boolean
  $flushBottom: boolean
  $fade?: boolean
}>(({ theme, $expanded, $flushBottom, $fade }) => ({
  minHeight: 0,
  // Margin (not padding) so max-height maps cleanly to whole line boxes.
  margin: theme.spacing.small,
  marginBottom: $flushBottom ? 0 : theme.spacing.small,
  fontSize: theme.partials.text.body2.fontSize,
  lineHeight: 1.45,
  maxHeight: $expanded ? '16lh' : '4lh',
  overflow: $expanded ? 'auto' : 'hidden',
  color: theme.colors['text-long-form'],
  ...($fade && {
    maskImage: 'linear-gradient(to bottom, #000 55%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent 100%)',
  }),
}))

/** Shared expand control (Prompt / tool previews / user prompts). */
export const ShowMoreSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.body2,
  flexShrink: 0,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px ${theme.spacing.small}px`,
  alignSelf: 'flex-start',
  color: theme.colors['text-xlight'],
  cursor: 'pointer',
  '&:hover': {
    color: theme.colors['text-light'],
    textDecoration: 'underline',
  },
}))
