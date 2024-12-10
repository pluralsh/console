import { Chip } from '@pluralsh/design-system'
import { ViolationStatisticsQuery } from 'generated/graphql'
import { ViolationFilter } from '../Policies'

export function AggregatedPolicyStatsChip({
  violationFilter,
  kindsData,
  namespacesData,
}: {
  violationFilter: ViolationFilter
  kindsData?: ViolationStatisticsQuery
  namespacesData?: ViolationStatisticsQuery
}) {
  let severity
  let total = 0
  if (violationFilter === ViolationFilter.Violated) {
    severity = 'danger'
    total =
      (kindsData?.violationStatistics?.reduce(
        (acc, curr) => acc + (curr?.count ?? 0),
        0
      ) ?? 0) +
      (namespacesData?.violationStatistics?.reduce(
        (acc, curr) => acc + (curr?.count ?? 0),
        0
      ) ?? 0)
  } else if (violationFilter === ViolationFilter.Passing) {
    severity = 'success'
    // TODO
    // total =
    //   (kindsData?.violationStatistics?.reduce(
    //     (acc, curr) => acc + (curr?.count ?? 0),
    //     0
    //   ) ?? 0) +
    //   (namespacesData?.violationStatistics?.reduce(
    //     (acc, curr) => acc + (curr?.count ?? 0),
    //     0
    //   ) ?? 0)
  } else {
    severity = 'neutral'
    // TODO
    // total =
    //   (kindsData?.violationStatistics?.reduce(
    //     (acc, curr) => acc + (curr?.count ?? 0),
    //     0
    //   ) ?? 0) +
    //   (namespacesData?.violationStatistics?.reduce(
    //     (acc, curr) => acc + (curr?.count ?? 0),
    //     0
    //   ) ?? 0)
  }

  return <Chip severity={severity}>{total}</Chip>
}
