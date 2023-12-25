import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { StatusChart } from './Deployment'
import { InfoSectionH2, PaddedCard, PropWideBold } from './common'

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
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
      }}
    >
      <InfoSectionH2 css={{ marginBottom: theme.spacing.medium }}>
        Status
      </InfoSectionH2>
      <PaddedCard>
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.xlarge,
          }}
        >
          <div
            css={{
              display: 'flex',
              width: 180,
              height: 180,
            }}
          >
            <StatusChart
              available={numberReady}
              unavailable={currentNumberScheduled - numberReady}
              pending={desiredNumberScheduled - currentNumberScheduled}
            />
          </div>
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              justifyContent: 'center',
            }}
          >
            <PropWideBold title="Desired">
              {desiredNumberScheduled || 0}
            </PropWideBold>
            <PropWideBold title="Current Scheduled">
              {currentNumberScheduled || 0}
            </PropWideBold>
            <PropWideBold title="Ready">{numberReady || 0}</PropWideBold>
          </div>
        </div>
      </PaddedCard>
      <InfoSectionH2
        css={{
          marginBottom: theme.spacing.medium,
          marginTop: theme.spacing.large,
        }}
      >
        Spec
      </InfoSectionH2>
      <PaddedCard>
        <PropWideBold title="Strategy">
          {spec?.strategy?.type || '-'}
        </PropWideBold>
      </PaddedCard>
    </div>
  )
}
