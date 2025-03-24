import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { FLOWS_ABS_PATH } from 'routes/flowRoutesConsts'

const getBreadcrumbs = (flowId: string) => [
  { label: 'flows', url: FLOWS_ABS_PATH },
  { label: flowId, url: `${FLOWS_ABS_PATH}/${flowId}` },
]

export function Flow() {
  const { flowId } = useParams()
  useSetBreadcrumbs(useMemo(() => getBreadcrumbs(flowId ?? ''), [flowId]))
  return <div>Flow details</div>
}
