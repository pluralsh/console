import {
  ArrowUpIcon,
  BellIcon,
  Button,
  ChartIcon,
  Flex,
} from '@pluralsh/design-system'
import { TRUNCATE } from 'components/utils/truncate'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import { WorkbenchJobCreateInput } from '../WorkbenchJobCreateInput'
import { Link, useNavigate } from 'react-router-dom'
import {
  getWorkbenchMonitoringAbsPath,
  getWorkbenchMonitoringDashboardCreateAbsPath,
  getWorkbenchMonitoringMonitorCreateAbsPath,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'

export type MonitoringBuildKind = 'dashboard' | 'monitor'

const BUILD_COPY: Record<
  MonitoringBuildKind,
  { title: string; cancel: string }
> = {
  dashboard: { title: 'Build a new dashboard', cancel: 'Cancel new dashboard' },
  monitor: { title: 'Build a new monitor', cancel: 'Cancel new monitor' },
}

const SUGGESTIONS: Record<
  MonitoringBuildKind,
  { title: string; prompt: string }[]
> = {
  dashboard: [
    {
      title: 'Get Datadog dashboards',
      prompt: 'Grab all my Datadog dashboard and pull them into Plural',
    },
    {
      title: 'Track deployment',
      prompt: 'Track service deployment across clusters',
    },
    {
      title: 'Evaluate performance',
      prompt: 'Evaluate console application performance',
    },
  ],
  monitor: [
    {
      title: 'Reconcile errors',
      prompt: 'Alert when reconcile errors exceed 5% for ten minutes',
    },
    {
      title: 'p95 latency alert',
      prompt: 'Alert when console p95 latency cross 500ms',
    },
    {
      title: 'Out of synch',
      prompt: 'Alert when a service is out of synch for an hour',
    },
  ],
}

export function WorkbenchMonitoringBuild({
  workbenchId,
  workbenchLoading,
  kind,
}: {
  workbenchId: string
  workbenchLoading: boolean
  kind: MonitoringBuildKind
}) {
  const navigate = useNavigate()
  const copy = BUILD_COPY[kind]
  const createPath =
    kind === 'dashboard'
      ? getWorkbenchMonitoringDashboardCreateAbsPath(workbenchId)
      : getWorkbenchMonitoringMonitorCreateAbsPath(workbenchId)

  return (
    <WrapperSC>
      <SubtitleSC>
        {kind === 'dashboard' ? (
          <ChartIcon size={20} />
        ) : (
          <BellIcon size={20} />
        )}
        <h1>{copy.title}</h1>
      </SubtitleSC>
      <WorkbenchJobCreateInput
        workbenchId={workbenchId}
        workbenchLoading={workbenchLoading}
        placeholder="Describe what you want to build or questions you have on your clusters."
        bgColor="fill-one-selected"
      />
      <SuggestionsSC>
        {SUGGESTIONS[kind].map((suggestion) => (
          <SuggestionCardSC
            key={suggestion.title}
            type="button"
            onClick={() =>
              navigate(createPath, {
                replace: true,
                state: { prompt: suggestion.prompt },
              })
            }
            aria-label={`Use suggestion: ${suggestion.title}`}
          >
            <Flex
              align="center"
              gap="small"
            >
              <TitleSC>{suggestion.title}</TitleSC>
              <ArrowSC>
                <ArrowUpIcon size={14} />
              </ArrowSC>
            </Flex>
            <PromptSC>{suggestion.prompt}</PromptSC>
          </SuggestionCardSC>
        ))}
      </SuggestionsSC>
      <Flex justify="center">
        <Button
          small
          floating
          as={Link}
          to={getWorkbenchMonitoringAbsPath(workbenchId)}
        >
          {copy.cancel}
        </Button>
      </Flex>
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  marginInline: 'auto',
  maxWidth: 800,
  paddingTop: theme.spacing.xxlarge,
  width: '100%',
}))

const SubtitleSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.medium,
  justifyContent: 'center',
  '& h1': {
    ...theme.partials.text.title2,
    color: theme.colors.text,
    fontFamily: theme.fontFamilies.mono,
    margin: 0,
  },
}))

const SuggestionsSC = styled.div({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
})

const SuggestionCardSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  // fill-one-selected matches Figma fill/one #21242C (pre-rename tokens)
  backgroundColor: theme.colors['fill-one-selected'],
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.large,
  cursor: 'pointer',
  display: 'flex',
  flex: '1 1 0',
  flexDirection: 'column',
  gap: theme.spacing.small,
  minHeight: 120,
  minWidth: 256,
  padding: theme.spacing.medium,
  textAlign: 'left',
  '&:hover': {
    backgroundColor: theme.colors['fill-one-hover'],
  },
}))

const TitleSC = styled(Body2BoldP)({
  ...TRUNCATE,
  flex: 1,
  minWidth: 0,
})

const PromptSC = styled(Body2P)(({ theme }) => ({
  color: theme.colors['text-light'],
  display: '-webkit-box',
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
}))

const ArrowSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  // fill-two-selected matches Figma fill/two #2A2E37 (pre-rename tokens)
  backgroundColor: theme.colors['fill-two-selected'],
  borderRadius: '50%',
  color: theme.colors['icon-light'],
  display: 'flex',
  flexShrink: 0,
  height: 28,
  justifyContent: 'center',
  width: 28,
}))
