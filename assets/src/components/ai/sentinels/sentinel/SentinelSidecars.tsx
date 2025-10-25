import { Sidecar, SidecarItem } from '@pluralsh/design-system'
import { SentinelFragment, SentinelRunFragment } from 'generated/graphql'

import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { SidecarSkeleton } from 'components/utils/SkeletonLoaders'
import { InlineA } from 'components/utils/typography/Text'
import { formatLocalizedDateTime, fromNow } from '../../../../utils/datetime'

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
          {sentinel.repository?.httpsPath && (
            <SidecarItem heading="Source">
              <InlineA href={sentinel.repository.httpsPath}>
                {sentinel.repository.httpsPath}
              </InlineA>
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
          {run.insertedAt && (
            <SidecarItem heading="Started">
              {formatLocalizedDateTime(run.insertedAt)}
            </SidecarItem>
          )}
          {run.completedAt && (
            <SidecarItem heading="Completed">
              {formatLocalizedDateTime(run.completedAt)}
            </SidecarItem>
          )}
          {run.sentinel?.repository?.httpsPath && (
            <SidecarItem heading="Source">
              <InlineA href={run.sentinel.repository.httpsPath}>
                {run.sentinel.repository.httpsPath}
              </InlineA>
            </SidecarItem>
          )}
        </Sidecar>
      )}
    </ResponsiveLayoutSidecarContainer>
  )
}
