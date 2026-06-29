import { AgentTodosTimeline } from 'components/ai/common/AgentTodosTimeline'
import { AgentTodoFragment } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

function normalizeTodos(todos: AgentTodoFragment[]) {
  return todos
    .filter(isNonNullable)
    .map((todo) => ({
      ...todo,
      title: todo.title?.trim() ?? '',
      description: todo.description?.trim() ?? '',
      done: !!todo.done,
    }))
    .filter((todo) => todo.title.length > 0 || todo.description.length > 0)
}

export function AgentRunTodos({
  todos: rawTodos,
}: {
  todos: AgentTodoFragment[]
}) {
  const todos = normalizeTodos(rawTodos)

  return <AgentTodosTimeline todos={todos} />
}
