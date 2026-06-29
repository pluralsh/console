import { AgentTodosTimeline } from 'components/ai/common/AgentTodosTimeline'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { WorkbenchJobResultFragment } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'

function toTodos(result?: WorkbenchJobResultFragment | null) {
  return (result?.todos ?? [])
    .filter(isNonNullable)
    .map((todo) => ({
      title: todo.name?.trim() ?? '',
      description: todo.description?.trim() ?? '',
      done: !!todo.done,
    }))
    .filter((todo) => todo.title.length > 0 || todo.description.length > 0)
}

export function WorkbenchJobTodos({
  loading,
  result,
}: {
  loading: boolean
  result?: WorkbenchJobResultFragment | null
}) {
  const todos = toTodos(result)

  if (loading)
    return (
      <RectangleSkeleton
        $height="180px"
        $width="100%"
      />
    )

  return (
    <AgentTodosTimeline
      title="Agent todos"
      todos={todos}
    />
  )
}
