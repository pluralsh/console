import {
  ArrowRightIcon,
  CheckOutlineIcon,
  CircleDashIcon,
} from '@pluralsh/design-system'
import {
  Body2BoldP,
  Body2P,
  CaptionP,
  Subtitle1H1,
} from 'components/utils/typography/Text'
import { isEmpty } from 'lodash'
import { useEffect, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'

const DESCRIPTION_CLAMP_LINES = 3

export type AgentTodosTimelineItem = {
  title: string
  description: string
  done: boolean
}

export function AgentTodosTimeline({
  todos,
  title,
}: {
  todos: AgentTodosTimelineItem[]
  title?: string
}) {
  const { colors } = useTheme()
  const activePendingIndex = todos.findIndex((todo) => !todo.done)

  return (
    <TimelineWrapperSC>
      {title && <Subtitle1H1 $color="text">{title}</Subtitle1H1>}
      {isEmpty(todos) ? (
        <CaptionP $color="text-xlight">No to-do items yet.</CaptionP>
      ) : (
        <TimelineListSC>
          {todos.map((todo, index) => {
            const description = todo.description
            const isActivePending = !todo.done && index === activePendingIndex
            const todoKey = getTodoKey(todo, index)

            return (
              <TimelineItemSC key={todoKey}>
                <SpineSC>
                  <NodeSC>
                    {todo.done ? (
                      <CheckOutlineIcon
                        color={colors['icon-light']}
                        size={16}
                      />
                    ) : isActivePending ? (
                      <ActivePendingNodeSC>
                        <ArrowRightIcon
                          color={colors['icon-light']}
                          size={10}
                        />
                      </ActivePendingNodeSC>
                    ) : (
                      <CircleDashIcon
                        color={colors['icon-light']}
                        size={16}
                      />
                    )}
                  </NodeSC>
                  {index < todos.length - 1 && <ConnectorSC />}
                </SpineSC>
                <TodoBodySC>
                  <Body2BoldP $color="text">{todo.title}</Body2BoldP>
                  {description && <TodoDescription description={description} />}
                </TodoBodySC>
              </TimelineItemSC>
            )
          })}
        </TimelineListSC>
      )}
    </TimelineWrapperSC>
  )
}

function TodoDescription({ description }: { description: string }) {
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)

  useEffect(() => {
    const element = descriptionRef.current

    if (!element) return

    const updateCanExpand = () => {
      const lineHeight = Number.parseFloat(
        window.getComputedStyle(element).lineHeight
      )
      const collapsedHeight =
        (Number.isFinite(lineHeight) ? lineHeight : 20) *
        DESCRIPTION_CLAMP_LINES

      const nextCanExpand = element.scrollHeight > collapsedHeight + 1

      setCanExpand((canExpand) =>
        canExpand === nextCanExpand ? canExpand : nextCanExpand
      )
    }

    updateCanExpand()

    const resizeObserver = new ResizeObserver(updateCanExpand)
    resizeObserver.observe(element)

    return () => resizeObserver.disconnect()
  }, [description])

  return (
    <>
      <DescriptionSC
        ref={descriptionRef}
        $color="text-xlight"
        $expanded={expanded}
      >
        {description}
      </DescriptionSC>
      {canExpand && (
        <ReadMoreSC
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((expanded) => !expanded)}
        >
          {expanded ? 'Read less' : 'Read more'}
        </ReadMoreSC>
      )}
    </>
  )
}

const getTodoKey = (
  { title, description }: AgentTodosTimelineItem,
  index: number
) => `${title || 'todo'}-${description || 'desc'}-${index}`

const TimelineWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xlarge,
  width: '100%',
}))

const TimelineListSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
}))

const TimelineItemSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing.medium,
  minWidth: 0,
}))

const SpineSC = styled.div({
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  flexShrink: 0,
  alignSelf: 'stretch',
  width: 24,
  minHeight: 60,
})

const NodeSC = styled.div(() => ({
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
}))

const ActivePendingNodeSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 16,
  height: 16,
  border: `1px solid ${theme.colors['icon-light']}`,
  borderRadius: '50%',
}))

const ConnectorSC = styled.div(({ theme }) => ({
  position: 'absolute',
  top: 24,
  bottom: -theme.spacing.xsmall,
  left: '50%',
  width: 1,
  transform: 'translateX(-50%)',
  background: theme.colors.border,
}))

const TodoBodySC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  paddingBottom: theme.spacing.large,
}))

const DescriptionSC = styled(Body2P)<{ $expanded?: boolean }>(
  ({ $expanded }) => ({
    ...(!$expanded && {
      display: '-webkit-box',
      overflow: 'hidden',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: DESCRIPTION_CLAMP_LINES,
    }),
  })
)

const ReadMoreSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.caption,
  alignSelf: 'flex-end',
  color: theme.colors['text-xlight'],
  cursor: 'pointer',
  '&:hover': {
    color: theme.colors['text-light'],
    textDecoration: 'underline',
  },
}))
