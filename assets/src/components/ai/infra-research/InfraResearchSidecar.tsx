import { Sidecar, SidecarItem } from '@pluralsh/design-system'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { SidecarSkeleton } from 'components/utils/SkeletonLoaders'
import { InfraResearchFragment } from 'generated/graphql'
import { formatLocalizedDateTime } from 'utils/datetime'
import { InfraResearchStatusChip } from './InfraResearches'

export function InfraResearchSidecar({
  infraResearch,
}: {
  infraResearch: Nullable<InfraResearchFragment>
}) {
  return (
    <ResponsiveLayoutSidecarContainer>
      {!infraResearch ? (
        <SidecarSkeleton />
      ) : (
        <Sidecar>
          <SidecarItem heading="Status">
            <InfraResearchStatusChip
              status={infraResearch.status}
              size="small"
            />
          </SidecarItem>
          {infraResearch.threads && infraResearch.threads.length > 0 && (
            <SidecarItem heading="Threads">
              {infraResearch.threads.length}
            </SidecarItem>
          )}
          {infraResearch.diagram && (
            <SidecarItem heading="Diagram">
              {infraResearch.diagram ? 'Available' : 'Not generated'}
            </SidecarItem>
          )}
          {infraResearch.analysis && (
            <SidecarItem heading="Analysis">
              {infraResearch.analysis ? 'Available' : 'Not generated'}
            </SidecarItem>
          )}
          <SidecarItem heading="ID">{infraResearch.id}</SidecarItem>
          <SidecarItem heading="Created">
            {formatLocalizedDateTime(infraResearch.insertedAt)}
          </SidecarItem>
          <SidecarItem heading="Updated">
            {formatLocalizedDateTime(infraResearch.updatedAt)}
          </SidecarItem>
        </Sidecar>
      )}
    </ResponsiveLayoutSidecarContainer>
  )
}
