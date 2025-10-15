import { Sidecar, SidecarItem } from '@pluralsh/design-system'
import { SentinelFragment, SentinelRunFragment } from 'generated/graphql'

import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { SidecarSkeleton } from 'components/utils/SkeletonLoaders'
import { formatLocalizedDateTime, fromNow } from '../../../../utils/datetime'
import { SentinelStatusChip } from '../SentinelsTableCols'

export function SentinelDetailsSidecar({
  sentinel,
}: {
  sentinel: Nullable<SentinelFragment>
}) {
  return (
    <ResponsiveLayoutSidecarContainer>
      {!sentinel ? (
        <SidecarSkeleton />
      ) : (
        <Sidecar>
          {sentinel.lastRunAt && (
            <SidecarItem heading="Last run">
              {fromNow(sentinel.lastRunAt)}
            </SidecarItem>
          )}
          {sentinel.checks && (
            <SidecarItem heading="Checks">{sentinel.checks.length}</SidecarItem>
          )}
          {sentinel.repository?.url && (
            <SidecarItem heading="Source">
              {sentinel.repository.url}
            </SidecarItem>
          )}
          <SidecarItem heading="ID">{sentinel.id}</SidecarItem>
          <SidecarItem heading="Created">
            {formatLocalizedDateTime(sentinel.insertedAt)}
          </SidecarItem>
          <SidecarItem heading="Updated">
            {formatLocalizedDateTime(sentinel.updatedAt)}
          </SidecarItem>
        </Sidecar>
      )}
    </ResponsiveLayoutSidecarContainer>
  )
}

export function SentinelRunSidecar({
  run,
}: {
  run: Nullable<SentinelRunFragment>
}) {
  return (
    <ResponsiveLayoutSidecarContainer>
      {!run ? (
        <SidecarSkeleton />
      ) : (
        <Sidecar>
          {run.status && (
            <SidecarItem heading="Status">
              <SentinelStatusChip status={run.status} />
            </SidecarItem>
          )}
          {run.insertedAt && (
            <SidecarItem heading="Started">
              {formatLocalizedDateTime(run.insertedAt)}
            </SidecarItem>
          )}
          {/* TODO: add when field is available on the query */}
          {/* {run.completedAt && (
            <SidecarItem heading="Completed">
              {formatLocalizedDateTime(run.completedAt)}
            </SidecarItem>
          )} */}
          {run.sentinel?.repository?.url && (
            <SidecarItem heading="Source">
              {run.sentinel.repository.url}
            </SidecarItem>
          )}
        </Sidecar>
      )}
    </ResponsiveLayoutSidecarContainer>
  )
}
