import { Card } from '@pluralsh/design-system'

import { Flex } from 'honorable'

import PropWide from 'components/utils/PropWide'
import { ComponentStatus } from 'components/apps/app/components/misc'
import { Pod } from 'generated/graphql'
import { LabelPairsSection } from 'components/utils/LabelPairsSection'
import { Readiness, podStatusToReadiness } from 'utils/status'

import { ContainersReadyChip } from '../TableElements'

import { getPodContainersStats as getContainersStats } from '../containers/getPodContainersStats'

type Phase = 'Running' | 'Succeeded' | 'Pending' | 'Failed'

function phaseToReadiness(phase?: string | null) {
  switch (phase as Phase) {
  case 'Running':
  case 'Succeeded':
    return Readiness.Ready
  case 'Pending':
    return Readiness.InProgress
  case 'Failed':
    return Readiness.Failed
  default:
    return null
  }
}

export default function Metadata({ pod }: { pod: Pod }) {
  const { labels, annotations } = pod.metadata
  const containerStats = getContainersStats(pod.status)

  return (
    <Flex direction="column">
      <Card padding="large">
        <Flex
          direction="column"
          gap="large"
        >
          <LabelPairsSection
            vals={labels}
            title="Labels"
          />
          <LabelPairsSection
            vals={annotations}
            title="Annotations"
          />
          <div>
            <PropWide
              title="containers"
              fontWeight={600}
            >
              <ContainersReadyChip
                ready={containerStats.ready || 0}
                total={containerStats.total || 0}
                statuses={containerStats.statuses || []}
              />
            </PropWide>

            <PropWide
              title="Phase"
              fontWeight={600}
            >
              <ComponentStatus status={phaseToReadiness(pod?.status?.phase)} />
            </PropWide>
            <PropWide
              title="Readiness"
              fontWeight={600}
            >
              <ComponentStatus status={podStatusToReadiness(pod?.status)} />
            </PropWide>
          </div>
        </Flex>
      </Card>
    </Flex>
  )
}
