import {
  Button,
  Card,
  Divider,
  Flex,
  Input2,
  Switch,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert.tsx'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import {
  useDeploymentSettingsSuspenseQuery,
  useUpdateDeploymentSettingsMutation,
} from 'generated/graphql'
import { useState } from 'react'
import styled, { useTheme } from 'styled-components'
import {
  formatMinutesAsDuration as toDuration,
  isValidDuration,
  parseDurationToMinutes as fromDuration,
} from 'utils/datetime.ts'

export function AISettingsAIInsights() {
  const theme = useTheme()
  const { popToast } = useSimpleToast()
  const { data: deploymentSettings, error: deploymentSettingsError } =
    useDeploymentSettingsSuspenseQuery()
  const ai = deploymentSettings.deploymentSettings?.ai

  const [fastInterval, setFastInterval] = useState(
    toDuration(ai?.analysisRates?.fast)
  )
  const [slowInterval, setSlowInterval] = useState(
    toDuration(ai?.analysisRates?.slow)
  )
  const [logAnalysis, setLogAnalysis] = useState(ai?.logAnalysis ?? false)

  const isValid = isValidDuration(fastInterval) && isValidDuration(slowInterval)
  const hasChanges =
    isValid &&
    (fastInterval !== toDuration(ai?.analysisRates?.fast) ||
      slowInterval !== toDuration(ai?.analysisRates?.slow) ||
      logAnalysis !== (ai?.logAnalysis ?? false))

  const [mutation, { loading, error }] = useUpdateDeploymentSettingsMutation({
    onCompleted: (data) => {
      const updatedAi = data?.updateDeploymentSettings?.ai
      setFastInterval(toDuration(updatedAi?.analysisRates?.fast))
      setSlowInterval(toDuration(updatedAi?.analysisRates?.slow))
      setLogAnalysis(!!updatedAi?.logAnalysis)
      popToast({ content: 'Changes saved', severity: 'success' })
    },
  })

  const handleReset = () => {
    setFastInterval(toDuration(ai?.analysisRates?.fast))
    setSlowInterval(toDuration(ai?.analysisRates?.slow))
    setLogAnalysis(!!ai?.logAnalysis)
  }

  const handleSave = () => {
    if (!ai?.enabled || !isValid) return

    mutation({
      variables: {
        attributes: {
          ai: {
            enabled: true,
            analysisRates: {
              fast: fromDuration(fastInterval),
              slow: fromDuration(slowInterval),
            },
            logAnalysis,
          },
        },
      },
    })
  }

  return (
    <ScrollablePage>
      <Flex
        direction="column"
        gap="medium"
      >
        <Body2P $color="text-light">
          Continuous background analysis of your fleet. Plural AI scans
          clusters, services, and stacks on two cadences and surfaces issues to
          the inbox.
        </Body2P>
        {deploymentSettingsError && (
          <GqlError error={deploymentSettingsError} />
        )}
        {error && <GqlError error={error} />}
        <Card
          css={{
            display: 'flex',
            flexDirection: 'column',
            padding: theme.spacing.xlarge,
          }}
        >
          <InsightRowSC>
            <InsightCopySC>
              <Body2BoldP>Fast scan interval</Body2BoldP>
              <Body2P $color="text-light">
                High-priority signals: failing runs, drift, recent incidents,
                alerts in the last hour. E.g. 30m, 4h, 1d, empty disables this
                tier.
              </Body2P>
            </InsightCopySC>
            <ControlSC>
              <Input2
                suffix="Duration"
                value={fastInterval}
                error={!isValidDuration(fastInterval)}
                onChange={(e) => setFastInterval(e.currentTarget.value)}
              />
            </ControlSC>
          </InsightRowSC>
          <Divider backgroundColor="border-fill-two" />
          <InsightRowSC>
            <InsightCopySC>
              <Body2BoldP>Slow scan interval</Body2BoldP>
              <Body2P $color="text-light">
                Background cadence for healthy resources, cost reviews, and
                stale workloads. Heavier prompts, less frequent. Recommended ≥
                4× fast interval.
              </Body2P>
            </InsightCopySC>
            <ControlSC>
              <Input2
                suffix="Duration"
                value={slowInterval}
                error={!isValidDuration(slowInterval)}
                onChange={(e) => setSlowInterval(e.currentTarget.value)}
              />
            </ControlSC>
          </InsightRowSC>
          <Divider backgroundColor="border-fill-two" />
          <InsightRowSC>
            <InsightCopySC>
              <Body2BoldP>Log data in insights</Body2BoldP>
              <Body2P $color="text-light">
                Attach recent logs to insight prompts. Better root-cause
                analysis. Last 200 lines per resource.
              </Body2P>
            </InsightCopySC>
            <ControlSC>
              <Switch
                checked={logAnalysis}
                onChange={setLogAnalysis}
              >
                Include logs
              </Switch>
            </ControlSC>
          </InsightRowSC>
        </Card>
        <Flex
          justify="flex-end"
          gap="medium"
        >
          <Button
            secondary
            type="button"
            disabled={!hasChanges || loading}
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            type="button"
            disabled={!hasChanges || loading}
            loading={loading}
            onClick={handleSave}
          >
            Save changes
          </Button>
        </Flex>
      </Flex>
    </ScrollablePage>
  )
}

const InsightRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.xlarge,
  padding: `${theme.spacing.medium}px 0`,
  '&:first-child': { paddingTop: 0 },
  '&:last-child': { paddingBottom: 0 },
}))

const InsightCopySC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  flex: 1,
  minWidth: 0,
}))

const ControlSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'center',
  flexShrink: 0,
  width: '100%',
  maxWidth: 220,
})
