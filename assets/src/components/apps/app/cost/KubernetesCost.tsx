import { useMemo } from 'react'
import { sum } from 'lodash'
import { Flex, Span } from 'honorable'
import { ProgressBar } from '@pluralsh/design-system'

const MINUTES_MONTH = 60 * 24 * 30

const round = v => Math.round(v * 100) / 100

const scale = (amount, scalar) => round(amount * scalar)

export default function KubernetesCost({ cost }) {
  const scalar = cost ? Math.max(MINUTES_MONTH / cost.minutes, 1) : 1

  const data = useMemo(() => {
    const miscCost = cost.totalCost - (cost.cpuCost + cost.ramCost + cost.pvCost)

    return [
      { dim: 'cpu', cost: scale(cost.cpuCost, scalar) },
      { dim: 'memory', cost: scale(cost.ramCost, scalar) },
      { dim: 'storage', cost: scale(cost.pvCost, scalar) },
      { dim: 'misc.', cost: scale(miscCost, scalar) },
    ]
  }, [cost, scalar])

  const total = round(sum(data.map(({ cost }) => cost)))

  return (
    <Flex
      basis={600}
      direction="column"
      grow={1}
      shrink={1}
    >
      <Flex
        marginVertical={9}
        justify="space-between"
      >
        <Span
          body1
          fontWeight={600}
        >
          Kubernetes cost
        </Span>
        <Span color="text-light">${total}</Span>
      </Flex>
      {data.map(entry => (
        <Flex
          align="center"
          justify="space-between"
          gap="medium"
          marginVertical={9}
        >
          <Flex
            color="text-xlight"
            overline
            basis={250}
          >
            {entry.dim}
          </Flex>
          <Flex basis={320}>
            <ProgressBar
              height={4}
              mode="determinate"
              progress={entry.cost / total}
              progressColor="blue.400"
              completeColor="blue.400"
            />
          </Flex>
          <Flex
            basis={80}
            color="text-light"
            justify="end"
          >
            ${Number(entry.cost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Flex>
        </Flex>
      ))}
    </Flex>
  )
}
