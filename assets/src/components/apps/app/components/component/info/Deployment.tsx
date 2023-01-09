import { ResponsivePie } from '@nivo/pie'
import { Card } from '@pluralsh/design-system'
import PropWide from 'components/utils/PropWide'
import { Flex, H2 } from 'honorable'
import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

// TODO: <LogLink url={logUrl(metadata)} />
// TODO: <Metric
// namespace={repo}
// name={name}
// regex="-[a-z0-9]+-[a-z0-9]+"
// duration={duration}
// />
// TODO:   const [duration, setDuration] = useState(DURATIONS[0])
// headerEnd={tab === 'metrics' ? (
//   <RangePicker
//   duration={duration}
//   setDuration={setDuration}
// />
// ) : (
// <ScalingRecommenderModal
//   kind={ScalingTypes.DEPLOYMENT}
//   name={name}
//   namespace={repo}
// />
// )}

function DeploymentStatusChart({ available, unavailable, pending }: {available: number, unavailable: number, pending: number}) {
  const data = useMemo(() => [
    { id: 'Available', value: available, color: '#99F5D5' },
    { id: 'Unavailable', value: unavailable, color: '#F599A8' },
    { id: 'Pending', value: pending, color: '#FFF9C2' },
  ], [available, unavailable, pending])

  return (
    <ResponsivePie
      activeOuterRadiusOffset={3}
      borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
      colors={({ data: { color } }) => color}
      data={data}
      enableArcLabels={false}
      enableArcLinkLabels={false}
      innerRadius={0.75}
      margin={{
        top: 10, right: 10, bottom: 10, left: 10,
      }}
      theme={{ tooltip: { container: { background: '#2A2E37', color: '#FFFFFF' } } }}
    />
  )
}

export default function Deployment() {
  const { data } = useOutletContext<any>()

  if (!data?.deployment) return null

  const { deployment: { spec, status: { availableReplicas, replicas, unavailableReplicas } } } = data

  return (
    <Flex direction="column">
      <H2 marginBottom="medium">Status</H2>
      <Card padding="large">
        <Flex gap="xlarge">
          <Flex
            width={180}
            height={180}
          >
            <DeploymentStatusChart
              available={availableReplicas}
              unavailable={unavailableReplicas}
              pending={replicas - availableReplicas - unavailableReplicas}
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
              title="Available"
              fontWeight={600}
            >
              {availableReplicas || 0}
            </PropWide>
            <PropWide
              title="Unavailable"
              fontWeight={600}
            >
              {unavailableReplicas || 0}
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
          title="Strategy"
          fontWeight={600}
        >
          {spec?.strategy?.type || '-'}
        </PropWide>
      </Card>
    </Flex>
  )
}
