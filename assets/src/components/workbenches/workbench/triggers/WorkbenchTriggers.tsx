import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import { useWorkbenchTriggersSummaryQuery } from 'generated/graphql'
import { useMemo } from 'react'
import {
  Link,
  Outlet,
  useMatch,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM,
  WORKBENCHES_TRIGGERS_REL_PATH,
  WORKBENCHES_TRIGGERS_SCHEDULE_REL_PATH,
  WORKBENCHES_TRIGGERS_WEBHOOK_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'

import { getWorkbenchBreadcrumbs } from '../Workbench'
import {
  SidebarBtnSC,
  WorkbenchSplitLayoutSC,
} from '../create-edit/WorkbenchCreateOrEdit'
import {
  WorkbenchScheduleEmptyState,
  WorkbenchWebhookEmptyState,
} from './WorkbenchTriggersEmptyStates'

export const WEBHOOK_TRIGGER_REFETCH_QUERIES = [
  'WorkbenchTriggersSummary',
  'WorkbenchWebhooks',
]

export const SCHEDULE_TRIGGER_REFETCH_QUERIES = [
  'WorkbenchTriggersSummary',
  'WorkbenchCrons',
]

const DIRECTORY = [
  { path: WORKBENCHES_TRIGGERS_SCHEDULE_REL_PATH, label: 'Schedule trigger' },
  { path: WORKBENCHES_TRIGGERS_WEBHOOK_REL_PATH, label: 'Webhook trigger' },
]

export function WorkbenchTriggers() {
  const id = useParams()[WORKBENCH_PARAM_ID]
  const pathPrefix = `${getWorkbenchAbsPath(id)}/${WORKBENCHES_TRIGGERS_REL_PATH}`
  const tab =
    useMatch(`${pathPrefix}/:tab`)?.params.tab ??
    WORKBENCHES_TRIGGERS_SCHEDULE_REL_PATH
  const [searchParams] = useSearchParams()
  const isCreating =
    searchParams.get(WORKBENCHES_TRIGGERS_CREATE_QUERY_PARAM) === 'true'

  const { data, loading, error } = useWorkbenchTriggersSummaryQuery({
    variables: { id: id ?? '' },
    skip: !id,
  })

  const workbench = data?.workbench
  const hasSchedules = mapExistingNodes(workbench?.crons).length > 0
  const hasWebhooks = mapExistingNodes(workbench?.webhooks).length > 0
  const showEmptyState =
    !isCreating &&
    ((tab === WORKBENCHES_TRIGGERS_SCHEDULE_REL_PATH && !hasSchedules) ||
      (tab === WORKBENCHES_TRIGGERS_WEBHOOK_REL_PATH && !hasWebhooks))

  useSetBreadcrumbs(
    useMemo(
      () => [...getWorkbenchBreadcrumbs(workbench), { label: 'triggers' }],
      [workbench]
    )
  )

  if (error)
    return (
      <GqlError
        margin="large"
        error={error}
      />
    )

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
      overflow="auto"
      padding="large"
    >
      <StackedText
        loading={!data && loading}
        first={workbench?.name}
        second={workbench?.description}
      />
      <WorkbenchSplitLayoutSC>
        <Flex
          direction="column"
          width={200}
        >
          {DIRECTORY.map(({ path, label }) => (
            <SidebarBtnSC
              key={path}
              as={Link}
              to={path}
              $active={path === tab}
            >
              {label}
            </SidebarBtnSC>
          ))}
        </Flex>
        {!data && loading ? (
          <RectangleSkeleton
            $width="100%"
            $height="100%"
          />
        ) : showEmptyState ? (
          <Flex
            direction="column"
            gap="medium"
            flex={1}
          >
            {tab === WORKBENCHES_TRIGGERS_SCHEDULE_REL_PATH ? (
              <>
                {!hasSchedules && <WorkbenchScheduleEmptyState />}
                {!hasWebhooks && <WorkbenchWebhookEmptyState />}
              </>
            ) : (
              <>
                {!hasWebhooks && <WorkbenchWebhookEmptyState />}
                {!hasSchedules && <WorkbenchScheduleEmptyState />}
              </>
            )}
          </Flex>
        ) : (
          <Outlet />
        )}
      </WorkbenchSplitLayoutSC>
    </Flex>
  )
}
