import { ApolloError } from '@apollo/client'
import { EmptyState } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { ProjectUsageHistoryFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'

export function ProjectUsageTimeSeries({
  data,
  loading,
  error,
}: {
  data: ProjectUsageHistoryFragment[]
  loading: boolean
  error?: Nullable<ApolloError>
}) {
  if (error) return <GqlError error={error} />
  if (isEmpty(data))
    return loading ? (
      <LoadingIndicator />
    ) : (
      <EmptyState message="No data found- try adjusting your filters." />
    )

  return <div>time series graph</div>
}
