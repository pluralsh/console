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
import { isEmpty } from 'lodash'
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { prettifyToolJson } from './toolCallDisplay'

enum ToolCallTab {
  Input = 'input',
  Output = 'output',
}

export function useSlimToolCodeCss({
  showLanguageIcon = false,
}: { showLanguageIcon?: boolean } = {}) {
  const { colors } = useTheme()
  return {
    overflow: 'auto',
    minHeight: 0,
    '& > div > div:first-child': {
      minHeight: 36,
      padding: 8,
      color: colors['text-light'],
    },
    ...(!showLanguageIcon && {
      '& > div > div:first-child svg': {
        display: 'none',
      },
    }),
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
  flushTop = false,
  isPending,
}: {
  content: string
  attributes: Nullable<ChatTypeAttributes>
  customResultBody?: ReactNode
  hideArguments?: boolean
  flushTop?: boolean
  isPending?: boolean
}) {
  const { spacing } = useTheme()
  const slimCodeCss = useSlimToolCodeCss()

  const showInput = !hideArguments
  const hasResponse = !!(isPending || customResultBody || content)
  const showTabs = showInput

  const [tab, setTab] = useState<ToolCallTab>(() =>
    hasResponse ? ToolCallTab.Output : ToolCallTab.Input
  )
  const activeTab = showInput ? tab : ToolCallTab.Output
  const showingInput = showInput && activeTab === ToolCallTab.Input
  const showingOutput = activeTab === ToolCallTab.Output

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
      marginTop={flushTop ? 0 : spacing.xsmall}
    >
      {showTabs && (
        <SegmentedControlCardSC>
          <SegmentedControlBtn
            active={activeTab === ToolCallTab.Input}
            onClick={() => setTab(ToolCallTab.Input)}
          >
            Input
          </SegmentedControlBtn>
          <SegmentedControlBtn
            active={activeTab === ToolCallTab.Output}
            onClick={() => setTab(ToolCallTab.Output)}
          >
            Output
          </SegmentedControlBtn>
        </SegmentedControlCardSC>
      )}

      {showingInput && (
        <Code
          language="json"
          showHeader={false}
          css={slimCodeCss}
        >
          {prettifyToolJson(
            JSON.stringify(attributes?.tool?.arguments ?? null)
          )}
        </Code>
      )}

      {showingOutput && (
        <Flex
          direction="column"
          minWidth={0}
          width="100%"
        >
          {isPending && isEmpty(content) ? (
            <RunningToolOutputCode
              showHeader={false}
              fillLevel={2}
            />
          ) : isPending ? (
            <Code
              fillLevel={2}
              showHeader={false}
              css={slimCodeCss}
            >
              {content}
            </Code>
          ) : customResultBody ? (
            customResultBody
          ) : isJson(content) ? (
            <Code
              language="json"
              showHeader={false}
              css={slimCodeCss}
            >
              {prettifyToolJson(content)}
            </Code>
          ) : !isEmpty(content) ? (
            <PreviewablePanel contentKey={`resp:${content.length}:plain`}>
              {plainResponse}
            </PreviewablePanel>
          ) : (
            <PreviewablePanel contentKey="resp:empty">
              <EmptyOutputSC>No output yet</EmptyOutputSC>
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
  subtle = false,
  collapsedLines = 4,
}: {
  children: ReactNode
  contentKey: string
  /** Optional in-frame header (e.g. "Prompt"), matching Cursor-style tool boxes. */
  header?: ReactNode
  /** Use a quieter surface for nested content such as activity prompts. */
  subtle?: boolean
  /** Whole-line clamp while collapsed. */
  collapsedLines?: number
}) {
  const [expandedContentKey, setExpandedContentKey] = useState<string | null>(
    null
  )
  const [canExpand, setCanExpand] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const expanded = expandedContentKey === contentKey

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
    <PreviewBoxSC $subtle={subtle}>
      {header != null && <PreviewHeaderSC>{header}</PreviewHeaderSC>}
      <PreviewContentSC
        ref={contentRef}
        $expanded={expanded}
        $flushBottom={canExpand}
        $fade={!expanded && canExpand}
        $collapsedLines={collapsedLines}
      >
        {children}
      </PreviewContentSC>
      {canExpand && (
        <ShowMoreSC
          type="button"
          aria-expanded={expanded}
          onClick={() =>
            setExpandedContentKey((key) =>
              key === contentKey ? null : contentKey
            )
          }
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

const PreviewBoxSC = styled.div<{ $subtle: boolean }>(({ theme, $subtle }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  minHeight: 0,
  overflow: 'hidden',
  border: $subtle ? theme.borders['fill-one'] : theme.borders['fill-two'],
  borderRadius: theme.borderRadiuses.medium,
  backgroundColor: theme.colors[$subtle ? 'fill-one' : 'fill-two'],
}))

const EmptyOutputSC = styled.div(({ theme }) => ({
  color: theme.colors['text-disabled'],
  fontStyle: 'italic',
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
  $collapsedLines: number
}>(({ theme, $expanded, $flushBottom, $fade, $collapsedLines }) => ({
  minHeight: 0,
  // Margin (not padding) so max-height maps cleanly to whole line boxes.
  margin: theme.spacing.small,
  marginBottom: $flushBottom ? 0 : theme.spacing.small,
  fontSize: theme.partials.text.body2.fontSize,
  lineHeight: 1.45,
  maxHeight: $expanded ? '16lh' : `${$collapsedLines}lh`,
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
