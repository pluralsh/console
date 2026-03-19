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
import { useTheme } from 'styled-components'

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
  const theme = useTheme()
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
    <div
      css={{
        flex: 0.33,
        minHeight: 0,
        borderRadius: theme.borderRadiuses.large,
        border: theme.borders.default,
        position: 'relative',
        width: '100%',
      }}
    >
      <div
        css={{
          height: '100%',
          borderRadius: '5px',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'transparent',
        }}
      >
        <div
          css={{
            color: '#a1a5b0',
            fontSize: '12px',
            fontWeight: 400,
            letterSpacing: '1.25px',
            lineHeight: '16px',
            padding: '16px',
            textTransform: 'uppercase',
          }}
        >
          Agent todos
        </div>
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '0 16px 16px',
            maxHeight: '260px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: '#454954 transparent',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#454954',
              borderRadius: '999px',
            },
          }}
        >
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
            <span
              css={{
                color: '#a1a5b0',
                fontSize: '12px',
                letterSpacing: '0.5px',
                lineHeight: '16px',
              }}
            >
              No to-do items yet.
            </span>
          )}
        </div>
      </div>
    </div>
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
    <div
      css={{
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
      }}
    >
      <div css={{ marginTop: '2px', flexShrink: 0 }}>
        {todo.done ? (
          <CheckOutlineIcon color="icon-light" />
        ) : (
          <CircleDashIcon color="icon-light" />
        )}
      </div>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minWidth: 0,
          flex: 1,
        }}
      >
        <button
          onClick={onToggle}
          disabled={!canToggle}
          css={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            margin: 0,
            color: '#c5c9d2',
            fontSize: '12px',
            lineHeight: '16px',
            width: '100%',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            cursor: canToggle ? 'pointer' : 'default',
          }}
        >
          <span
            css={{
              fontWeight: 700,
            }}
          >
            {todo.name}
          </span>
          {hasDescription ? (
            <CaretDownIcon
              size={12}
              color="icon-xlight"
              css={{
                transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 180ms ease',
                flexShrink: 0,
              }}
            />
          ) : null}
        </button>
        {hasDescription && expanded ? (
          <div
            css={{
              color: '#a1a5b0',
              fontSize: '12px',
              lineHeight: '16px',
            }}
          >
            {todo.description}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function getTodoKey(todo: WorkbenchJobResultTodoFragment) {
  return `${todo.name ?? 'todo'}-${todo.description ?? 'desc'}`
}
