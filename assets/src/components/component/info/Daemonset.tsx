import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { StatusChart } from './Deployment'
import { InfoSection, PaddedCard, PropGroup, PropWideBold } from './common'

export default function DaemonSet() {
  const theme = useTheme()
  const { data } = useOutletContext<any>()

  if (!data?.daemonSet) return null

  const {
    daemonSet: {
      spec,
      status: { desiredNumberScheduled, numberReady, currentNumberScheduled },
    },
  } = data

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
