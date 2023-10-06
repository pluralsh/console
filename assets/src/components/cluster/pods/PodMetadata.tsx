import { Card } from '@pluralsh/design-system'

import { Flex } from 'honorable'

import PropWide from 'components/utils/PropWide'
import { ComponentStatusChip } from 'components/apps/app/components/misc'
import { Pod } from 'generated/graphql'
import { LabelPairsSection } from 'components/utils/LabelPairsSection'
import { Readiness, podStatusToReadiness } from 'utils/status'

import { getPodContainersStats as getContainersStats } from '../containers/getPodContainersStats'
import { ContainerStatuses } from '../ContainerStatuses'

type Phase = 'Running' | 'Succeeded' | 'Pending' | 'Failed'

function phaseToReadiness(phase?: string | null) {
  switch (phase as Phase | null | undefined) {
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
              <ContainerStatuses statuses={containerStats.statuses || []} />
            </PropWide>

            <PropWide
              title="Phase"
              fontWeight={600}
            >
              <ComponentStatusChip
                status={phaseToReadiness(pod?.status?.phase)}
              />
            </PropWide>
            <PropWide
              title="Readiness"
              fontWeight={600}
            >
              <ComponentStatusChip status={podStatusToReadiness(pod?.status)} />
            </PropWide>
          </div>
        </Flex>
      </Card>
    </Flex>
  )
}
