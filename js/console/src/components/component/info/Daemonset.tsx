import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { StatusChart } from './Deployment'
import { InfoSection, PaddedCard, PropGroup, PropWideBold } from './common'
import { ComponentDetailsContext } from '../ComponentDetails'

export default function DaemonSet() {
  const theme = useTheme()
  const { componentDetails: daemonSet } =
    useOutletContext<ComponentDetailsContext>()

  if (daemonSet?.__typename !== 'DaemonSet') return null

  const { spec, status } = daemonSet
  const desiredNumberScheduled = status?.desiredNumberScheduled ?? NaN
  const numberReady = status?.numberReady ?? NaN
  const currentNumberScheduled = status?.currentNumberScheduled ?? NaN

  return (
    <>
      <InfoSection title="Status">
        <PaddedCard>
          <div
            css={{
              display: 'flex',
              gap: theme.spacing.xlarge,
            }}
          >
            <StatusChart
              width={180}
              height={180}
              green={numberReady}
              red={currentNumberScheduled - numberReady}
              yellow={desiredNumberScheduled - currentNumberScheduled}
            />
            <PropGroup>
              <PropWideBold title="Desired">
                {desiredNumberScheduled || 0}
              </PropWideBold>
              <PropWideBold title="Current Scheduled">
                {currentNumberScheduled || 0}
              </PropWideBold>
              <PropWideBold title="Ready">{numberReady || 0}</PropWideBold>
            </PropGroup>
          </div>
        </PaddedCard>
      </InfoSection>
      <InfoSection title="Spec">
        <PaddedCard>
          <PropWideBold title="Strategy">
            {spec?.strategy?.type || '-'}
          </PropWideBold>
        </PaddedCard>
      </InfoSection>
    </>
  )
}
