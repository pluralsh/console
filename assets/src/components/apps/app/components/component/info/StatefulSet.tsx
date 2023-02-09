import { Card } from '@pluralsh/design-system'
import { PieChart } from 'components/utils/PieChart'
import PropWide from 'components/utils/PropWide'
import { Flex, H2 } from 'honorable'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

function StatusChart({ ready, notReady }: {ready: number, notReady: number}) {
  const data = useMemo(() => [
    { id: 'Ready', value: ready, color: '#99F5D5' },
    { id: 'Not ready', value: notReady, color: '#F599A8' },
  ], [ready, notReady])

  return <PieChart data={data} />
}

export default function StatefulSet() {
  const { data } = useOutletContext<any>()

  if (!data?.statefulSet) return null

  const {
    statefulSet: {
      spec, status: {
        replicas, currentReplicas, updatedReplicas, readyReplicas,
      },
    },
  } = data

  return (
    <Flex
      direction="column"
      grow={1}
    >
      <H2 marginBottom="medium">Status</H2>
      <Card padding="large">
        <Flex gap="xlarge">
          <Flex
            width={180}
            height={180}
          >
            <StatusChart
              ready={readyReplicas}
              notReady={replicas - readyReplicas}
            />
          </Flex>
          <Flex
            direction="column"
            grow={1}
            justify="center"
          >
            <PropWide
              title="Replicas"
              fontWeight={600}
            >
              {replicas || 0}
            </PropWide>
            <PropWide
              title="Current replicas"
              fontWeight={600}
            >
              {currentReplicas || 0}
            </PropWide>
            <PropWide
              title="Updated replicas"
              fontWeight={600}
            >
              {updatedReplicas || 0}
            </PropWide>
            <PropWide
              title="Ready replicas"
              fontWeight={600}
            >
              {readyReplicas || 0}
            </PropWide>
          </Flex>
        </Flex>
      </Card>
      <H2
        marginBottom="medium"
        marginTop="large"
      >
        Spec
      </H2>
      <Card padding="large">
        <PropWide
          title="Service name"
          fontWeight={600}
        >
          {spec?.serviceName || '-'}
        </PropWide>
      </Card>
    </Flex>
  )
}
