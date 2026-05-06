import { WorkbenchGraphCard } from 'components/workbenches/common/WorkbenchGraphCard'
import { evalGradeToColor } from 'components/workbenches/common/evalGradeColor'
import { ButtonGroup } from 'components/utils/ButtonGroup'
import { Flex, ProgressBar } from '@pluralsh/design-system'
import {
  WorkbenchEvalResultsWorkbenchAverage,
  EvalResultsPeriod,
  useWorkbenchesEvalsAvgGraphQuery,
} from 'generated/graphql'
import { useState } from 'react'
import { useTheme } from 'styled-components'
import { GqlError } from 'components/utils/Alert'
import { TRUNCATE } from 'components/utils/truncate'

const MAX_EVAL_SCORE = 10

export function WorkbenchesEvalsAvgGraph() {
  const theme = useTheme()
  const [range, setRange] = useState<RangeSelectorOption>('1W')

  const { data, loading, error } = useWorkbenchesEvalsAvgGraphQuery({
    variables: { period: rangeToPeriod[range] },
    fetchPolicy: 'cache-and-network',
  })

  if (error) return <GqlError error={error} />

  const workbenchAverages = deriveWorkbenchAverages(
    data?.averageWorkbenchEvalResults ?? []
  )
  const hasData = workbenchAverages.length > 0

  return (
    <WorkbenchGraphCard
      title="Average by workbench"
      rightContent={
        <ButtonGroup
          size="small"
          directory={rangeOptions.map((option) => ({
            path: option,
            label: option,
          }))}
          tab={range}
          onClick={(key) => setRange(key as RangeSelectorOption)}
        />
      }
      loading={loading}
    >
      {hasData ? (
        <Flex
          direction="column"
          gap="xsmall"
          css={{ paddingRight: theme.spacing.xxsmall }}
        >
          {workbenchAverages.map(({ id, name, score }) => {
            const color = evalGradeToColor(score)

            return (
              <div
                key={id}
                css={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(50px, 120px) 1fr auto',
                  gap: theme.spacing.small,
                  alignItems: 'center',
                }}
              >
                <div
                  css={{
                    ...TRUNCATE,
                    ...theme.partials.text.caption,
                    fontFamily: theme.fontFamilies.mono,
                    color: theme.colors['text-input-disabled'],
                  }}
                >
                  {name}
                </div>
                <ProgressBar
                  css={{ marginTop: 0, width: '100%' }}
                  height={6}
                  mode="determinate"
                  progress={clamp(score / MAX_EVAL_SCORE, 0, 1)}
                  progressColor={color}
                  completeColor={theme.colors['fill-three']}
                />
                <div
                  css={{
                    ...TRUNCATE,
                    ...theme.partials.text.caption,
                    fontFamily: theme.fontFamilies.mono,
                    color,
                  }}
                >
                  {formatScore(score)}
                </div>
              </div>
            )
          })}
        </Flex>
      ) : (
        <div
          css={{
            ...theme.partials.text.body2,
            color: theme.colors['text-xlight'],
            minHeight: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          No workbench grades yet.
        </div>
      )}
    </WorkbenchGraphCard>
  )
}

function deriveWorkbenchAverages(
  entries: Array<WorkbenchEvalResultsWorkbenchAverage | null>
) {
  const grouped = new Map<
    string,
    { id: string; name: string; score: number; samples: number }
  >()

  for (const entry of entries) {
    const wb = entry?.workbench
    if (!wb) continue

    const score = clamp(entry.average ?? 0, 0, MAX_EVAL_SCORE)
    const current = grouped.get(wb.id)

    if (!current) {
      grouped.set(wb.id, { id: wb.id, name: wb.name, score, samples: 1 })
      continue
    }

    current.score += score
    current.samples += 1
  }

  return [...grouped.values()]
    .map(({ samples, ...item }) => ({ ...item, score: item.score / samples }))
    .sort((a, b) => b.score - a.score)
}

function formatScore(value: number) {
  return `${value.toFixed(2)}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const rangeOptions = ['1D', '1W', '1M'] as const
type RangeSelectorOption = (typeof rangeOptions)[number]

const rangeToPeriod: Record<RangeSelectorOption, EvalResultsPeriod> = {
  '1D': EvalResultsPeriod.Day,
  '1W': EvalResultsPeriod.Week,
  '1M': EvalResultsPeriod.Month,
}
