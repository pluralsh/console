import { WarningIcon } from '@pluralsh/design-system'
import { isUsageOverBudget } from 'components/workbenches/common/WorkbenchUsageChips'
import {
  useWorkbenchJobsQuery,
  type WorkbenchJobBudgetAttributes,
} from 'generated/graphql'
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'

const RECENT_JOBS_FOR_WARNING = 3

export function WorkbenchBudgetSpendCapWarning({
  workbenchId,
  budget,
  skip = false,
}: {
  workbenchId?: Nullable<string>
  budget?: WorkbenchJobBudgetAttributes | null
  skip?: boolean
}) {
  const theme = useTheme()
  const hasCap =
    (budget?.tokens != null && budget.tokens > 0) ||
    (budget?.cost != null && budget.cost > 0)

  const { data } = useWorkbenchJobsQuery({
    variables: { id: workbenchId ?? '', first: RECENT_JOBS_FOR_WARNING },
    skip: skip || !workbenchId || !hasCap,
    fetchPolicy: 'cache-first',
  })

  const summary = useMemo(() => {
    if (!hasCap || !budget) return null

    const jobs = mapExistingNodes(data?.workbench?.runs).slice(
      0,
      RECENT_JOBS_FOR_WARNING
    )
    if (jobs.length === 0) return null

    const stopped = jobs.filter((job) =>
      isUsageOverBudget(job.usage, budget)
    ).length

    // Show when any of the last (up to 3) jobs would hit this cap.
    if (stopped === 0) return null

    return { stopped, total: jobs.length }
  }, [budget, data?.workbench?.runs, hasCap])

  if (!summary) return null

  return (
    <WarningSC>
      <WarningIcon
        size={16}
        color={theme.colors['icon-warning']}
      />
      <WarningTextSC>
        Consider a higher limit for coding agents. {summary.stopped} of{' '}
        {summary.total} recent jobs would have been stopped at this spend cap.
      </WarningTextSC>
    </WarningSC>
  )
}

const WarningSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing.small,
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  padding: theme.spacing.small,
  borderRadius: theme.borderRadiuses.large,
  backgroundColor: theme.colors.yellow[900],
  border: `1px solid ${theme.colors.yellow[800]}`,
  flexShrink: 0,
  '& > svg': { flexShrink: 0, marginTop: 1 },
}))

const WarningTextSC = styled.p(({ theme }) => ({
  ...theme.partials.text.caption,
  margin: 0,
  flex: '1 1 0',
  minWidth: 0,
  color: theme.colors.yellow[300],
  whiteSpace: 'normal',
  overflowWrap: 'break-word',
  wordBreak: 'break-word',
}))
