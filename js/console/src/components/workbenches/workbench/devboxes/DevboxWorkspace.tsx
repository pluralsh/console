import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { useWorkbenchDevboxInstancesQuery } from 'generated/graphql'
import {
  Navigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  getWorkbenchDevboxInstanceAbsPath,
  WORKBENCH_DEVBOX_INSTANCE_PARAM_ID,
  WORKBENCH_DEVBOX_NEW_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchOutletContext, WorkbenchPageLayout } from '../Workbench'
import { isInstanceTerminal } from './devboxIdle'
import { DevboxInstanceView } from './DevboxInstanceView'
import { DevboxNewInstance } from './DevboxNewInstance'
import {
  DEVBOX_SESSIONS_SIDEBAR_WIDTH,
  DEVBOX_SWITCHER_PAGE_SIZE,
  DevboxSessionsSidebar,
  sortInstances,
} from './DevboxSessionsSidebar'

// instance switcher and its sessions on the left, the session in the middle,
// the VM's files, terminal and browser on the right
export function DevboxWorkspace() {
  const { workbenchId } = useOutletContext<WorkbenchOutletContext>()
  const instanceId = useParams()[WORKBENCH_DEVBOX_INSTANCE_PARAM_ID]

  return (
    <WorkbenchPageLayout
      showEditWorkbenchButton={false}
      sidebar={{
        kind: 'custom',
        width: DEVBOX_SESSIONS_SIDEBAR_WIDTH,
        content: (
          <DevboxSessionsSidebar
            workbenchId={workbenchId}
            instanceId={instanceId}
          />
        ),
      }}
    >
      {instanceId ? (
        <DevboxInstanceView
          key={instanceId}
          instanceId={instanceId}
        />
      ) : (
        <DevboxLanding workbenchId={workbenchId} />
      )}
    </WorkbenchPageLayout>
  )
}

// opens the instance the switcher would list first, if any is still live,
// unless the user asked to start a new one
function DevboxLanding({ workbenchId }: { workbenchId: string }) {
  const [params] = useSearchParams()
  const creating = params.has(WORKBENCH_DEVBOX_NEW_QUERY_PARAM)
  const { data, error } = useWorkbenchDevboxInstancesQuery({
    variables: { id: workbenchId, first: DEVBOX_SWITCHER_PAGE_SIZE },
    skip: !workbenchId || creating,
    fetchPolicy: 'cache-and-network',
  })

  if (creating || error) return <DevboxNewInstance workbenchId={workbenchId} />
  if (!data)
    return (
      <PaddedSC>
        <RectangleSkeleton
          $height={480}
          $width="100%"
        />
      </PaddedSC>
    )

  const live = sortInstances(
    mapExistingNodes(data.workbench?.devboxInstances)
  ).find((i) => !isInstanceTerminal(i.status))
  return live ? (
    <Navigate
      replace
      to={getWorkbenchDevboxInstanceAbsPath({
        workbenchId,
        instanceId: live.id,
      })}
    />
  ) : (
    <DevboxNewInstance workbenchId={workbenchId} />
  )
}

const PaddedSC = styled.div(({ theme }) => ({
  padding: theme.spacing.large,
  width: '100%',
}))
