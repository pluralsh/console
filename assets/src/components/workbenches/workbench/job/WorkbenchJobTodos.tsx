import { AgentTodosTimeline } from 'components/ai/common/AgentTodosTimeline'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { WorkbenchJobResultFragment } from 'generated/graphql'
import { getWorkbenchJobTodos } from './workbenchJobResultUtils'

export function WorkbenchJobTodos({
  loading,
  result,
}: {
  loading: boolean
  result?: WorkbenchJobResultFragment | null
}) {
  const todos = getWorkbenchJobTodos(result)

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
