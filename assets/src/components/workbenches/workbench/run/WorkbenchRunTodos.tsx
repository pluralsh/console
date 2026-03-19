import {
  CaretDownIcon,
  CheckOutlineIcon,
  CircleDashIcon,
} from '@pluralsh/design-system'
import {
  WorkbenchJobResultFragment,
  WorkbenchJobResultTodoFragment,
} from '../../../../generated/graphql'
import { isNonNullable } from '../../../../utils/isNonNullable'
import { RectangleSkeleton } from '../../../utils/SkeletonLoaders'
import { useEffect, useState } from 'react'
import styled from 'styled-components'

function toTodos(result?: WorkbenchJobResultFragment | null) {
  return (result?.todos ?? [])
    .filter(isNonNullable)
    .map((todo) => ({
      ...todo,
      name: todo.name?.trim() ?? '',
      description: todo.description?.trim() ?? '',
      done: !!todo.done,
    }))
    .filter((todo) => todo.name.length > 0 || todo.description.length > 0)
}

export function WorkbenchRunTodos({
  loading,
  result,
}: {
  loading: boolean
  result?: WorkbenchJobResultFragment | null
}) {
  const todos = toTodos(result)
  const [expandedByKey, setExpandedByKey] = useState<Record<string, boolean>>(
    {}
  )

  useEffect(() => {
    result?.todos?.forEach((todo) => {
      const key = getTodoKey(todo as WorkbenchJobResultTodoFragment)
      setExpandedByKey((prev) => ({
        ...prev,
        [key]: !todo?.done,
      }))
    })
  }, [result?.todos])

  if (loading)
    return (
      <RectangleSkeleton
        css={{
          minHeight: '180px',
          width: '100%',
        }}
        $height="180px"
        $width="100%"
      />
    )

  return (
    <TodosPanelSC>
      <TodosInnerSC>
        <TodosTitleSC>Agent todos</TodosTitleSC>
        <TodosListSC>
          {todos.length > 0 ? (
            todos.map((todo) => {
              const key = getTodoKey(todo)
              const expanded = expandedByKey[key] ?? true

              return (
                <TodoRow
                  key={key}
                  todo={todo}
                  expanded={expanded}
                  onToggle={() =>
                    setExpandedByKey((prev) => ({
                      ...prev,
                      [key]: !expanded,
                    }))
                  }
                />
              )
            })
          ) : (
            <TodosEmptySC>No to-do items yet.</TodosEmptySC>
          )}
        </TodosListSC>
      </TodosInnerSC>
    </TodosPanelSC>
  )
}

function TodoRow({
  todo,
  expanded,
  onToggle,
}: {
  todo: {
    name: string
    description: string
    done: boolean
  }
  expanded: boolean
  onToggle: () => void
}) {
  const hasDescription = todo.description.length > 0
  const canToggle = hasDescription

  return (
    <TodoRowSC>
      <TodoIconWrapSC>
        {todo.done ? (
          <CheckOutlineIcon color="icon-light" />
        ) : (
          <CircleDashIcon color="icon-light" />
        )}
      </TodoIconWrapSC>
      <TodoContentSC>
        <TodoTitleButtonSC
          onClick={onToggle}
          disabled={!canToggle}
          $canToggle={canToggle}
        >
          <TodoTitleSC>{todo.name}</TodoTitleSC>
          {hasDescription ? (
            <CaretDownIcon
              size={12}
              color="icon-xlight"
              css={todoCaretStyle(expanded)}
            />
          ) : null}
        </TodoTitleButtonSC>
        {hasDescription && expanded ? (
          <TodoDescriptionSC>{todo.description}</TodoDescriptionSC>
        ) : null}
      </TodoContentSC>
    </TodoRowSC>
  )
}

function getTodoKey(todo: WorkbenchJobResultTodoFragment) {
  return `${todo.name ?? 'todo'}-${todo.description ?? 'desc'}`
}

function todoCaretStyle(expanded: boolean) {
  return {
    transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
    transition: 'transform 180ms ease',
    flexShrink: 0,
  }
}

const TodosPanelSC = styled.div(({ theme }) => ({
  flex: 0.33,
  minHeight: 0,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.default,
  position: 'relative',
  width: '100%',
}))

const TodosInnerSC = styled.div(({ theme }) => ({
  height: '100%',
  borderRadius: theme.borderRadiuses.medium,
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: 'transparent',
}))

const TodosTitleSC = styled.div(({ theme }) => ({
  color: theme.colors['text-xlight'],
  fontSize: '12px',
  fontWeight: 400,
  letterSpacing: '1.25px',
  lineHeight: '16px',
  padding: theme.spacing.large,
  textTransform: 'uppercase',
}))

const TodosListSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: `0 ${theme.spacing.large}px ${theme.spacing.large}px`,
  maxHeight: '260px',
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: `${theme.colors['border-fill-three']} transparent`,
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.colors['border-fill-three'],
    borderRadius: '999px',
  },
}))

const TodosEmptySC = styled.span(({ theme }) => ({
  color: theme.colors['text-xlight'],
  fontSize: '12px',
  letterSpacing: '0.5px',
  lineHeight: '16px',
}))

const TodoRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  alignItems: 'flex-start',
}))

const TodoIconWrapSC = styled.div({
  marginTop: '2px',
  flexShrink: 0,
})

const TodoContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  flex: 1,
}))

const TodoTitleButtonSC = styled.button<{ $canToggle: boolean }>(
  ({ $canToggle, theme }) => ({
    border: 'none',
    background: 'transparent',
    padding: 0,
    margin: 0,
    color: theme.colors['text-light'],
    fontSize: '12px',
    lineHeight: '16px',
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.small,
    cursor: $canToggle ? 'pointer' : 'default',
  })
)

const TodoTitleSC = styled.span({
  fontWeight: 700,
})

const TodoDescriptionSC = styled.div(({ theme }) => ({
  color: theme.colors['text-xlight'],
  fontSize: '12px',
  lineHeight: '16px',
}))
