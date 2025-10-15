import { Sidecar, SidecarItem } from '@pluralsh/design-system'
import { SentinelFragment } from 'generated/graphql'

import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { SidecarSkeleton } from 'components/utils/SkeletonLoaders'
import { formatLocalizedDateTime, fromNow } from '../../../utils/datetime'

export function SentinelSidecar({
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
