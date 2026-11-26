import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useSidePanelWidth } from 'components/layout/TopLevelSidePanel'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  useDevboxInstanceQuery,
  useWorkbenchDevboxInstancesQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import {
  Navigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  getWorkbenchDevboxInstanceAbsPath,
  getWorkbenchDevboxStartAbsPath,
  WORKBENCH_DEVBOX_INSTANCE_PARAM_ID,
  WORKBENCH_DEVBOX_NEW_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import {
  getWorkbenchBreadcrumbs,
  WorkbenchOutletContext,
  WorkbenchPageLayout,
} from '../Workbench'
import {
  DevboxPanelTab,
  useDevboxPanel,
  useDevboxPanelAutoOpen,
} from './DevboxControlPanel'

const WIDE_PANEL_TABS = new Set<DevboxPanelTab>(['terminal', 'browser'])
import { isInstanceTerminal } from './devboxIdle'
import { DevboxInstanceView } from './DevboxInstanceView'
import { DevboxNewInstance } from './DevboxNewInstance'
import { useDevboxTimelineStore } from './useDevboxTimeline'
import {
  DEVBOX_SESSIONS_SIDEBAR_WIDTH,
  DEVBOX_SWITCHER_PAGE_SIZE,
  DevboxSessionsSidebar,
  sortInstances,
} from './DevboxSessionsSidebar'

// the devboxes tab: opens the instance the switcher would list first, if any is
// still live, unless the user asked to start a new one
export function DevboxWorkspace() {
  const { workbenchId } = useOutletContext<WorkbenchOutletContext>()

  return (
    <WorkbenchPageLayout
      showEditWorkbenchButton={false}
      sidebar={{
        kind: 'custom',
        width: DEVBOX_SESSIONS_SIDEBAR_WIDTH,
        content: (
          <DevboxSessionsSidebar
            workbenchId={workbenchId}
            instanceId={null}
          />
        ),
      }}
    >
      <DevboxLanding workbenchId={workbenchId} />
    </WorkbenchPageLayout>
  )
}

// an instance, outside the workbench tabs like a job: its sessions on the left,
// the session (or the browser, a file, or a diff) in the middle, and the VM's
// files, terminal and browser in the app's side panel on the right
export function DevboxInstancePage() {
  const { workbenchId, workbench } = useOutletContext<WorkbenchOutletContext>()
  const instanceId = useParams()[WORKBENCH_DEVBOX_INSTANCE_PARAM_ID] ?? ''
  const { data } = useDevboxInstanceQuery({
    variables: { id: instanceId },
    skip: !instanceId,
    fetchPolicy: 'cache-first',
  })
  const instance = data?.devboxInstance
  const instanceName = instance ? instance.name || instance.id.slice(0, 8) : ''

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getWorkbenchBreadcrumbs(workbench),
        {
          label: 'devboxes',
          url: getWorkbenchDevboxStartAbsPath({ workbenchId }),
        },
        ...(instanceName
          ? [
              {
                label: instanceName,
                url: getWorkbenchDevboxInstanceAbsPath({
                  workbenchId,
                  instanceId,
                }),
              },
            ]
          : []),
      ],
      [workbench, workbenchId, instanceId, instanceName]
    )
  )
  const { tab } = useDevboxPanel()
  // the trees open what's picked in the main view, so they take the usual side panel width
  useSidePanelWidth(
    WIDE_PANEL_TABS.has(tab)
      ? { minWidth: 360, maxWidthVw: 70, initialWidthVw: 40 }
      : null
  )
  useDevboxPanelAutoOpen(instanceId)
  // shared so the sidebar files each approval under the thread it's for
  const timeline = useDevboxTimelineStore(instanceId)

  return (
    <PageSC>
      <DevboxSessionsSidebar
        workbenchId={workbenchId}
        instanceId={instanceId}
        timeline={timeline}
      />
      <DevboxInstanceView
        key={instanceId}
        instanceId={instanceId}
        timeline={timeline}
      />
    </PageSC>
  )
}

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

const PageSC = styled.div({
  display: 'flex',
  alignItems: 'stretch',
  height: '100%',
  minHeight: 0,
  minWidth: 0,
})

const PaddedSC = styled.div(({ theme }) => ({
  padding: theme.spacing.large,
  width: '100%',
}))
