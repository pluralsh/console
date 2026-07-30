import {
  ArrowTopRightIcon,
  Button,
  Flex,
  prettifyRepoUrl,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import { WorkbenchLinkCardFragment } from 'generated/graphql'
import { Link } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  getWorkbenchJobAbsPath,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'

export const WORKBENCH_LINK_HOVER_CARD_WIDTH = 260

type WorkbenchLinkHoverCardProps = {
  workbenchName: string
  workbenchId?: string
  workbenchJobId?: string
  jobInsertedAt?: string | null
  workbench?: WorkbenchLinkCardFragment | null
  pendingAgentRuns?: number
  onNavigate?: () => void
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex
      align="center"
      justify="space-between"
      gap="medium"
    >
      <CaptionP $color="text-xlight">{label}</CaptionP>
      <CaptionP
        $color="text-xlight"
        css={{ textAlign: 'right' }}
      >
        {value}
      </CaptionP>
    </Flex>
  )
}

export function WorkbenchLinkHoverCard({
  workbenchName,
  workbenchId,
  workbenchJobId,
  jobInsertedAt,
  workbench,
  pendingAgentRuns = 0,
  onNavigate,
}: WorkbenchLinkHoverCardProps) {
  const theme = useTheme()
  const cluster =
    workbench?.agentRuntime?.cluster?.handle ??
    workbench?.agentRuntime?.cluster?.name
  const owner = workbench?.botUser?.name
  const repo = prettifyRepoUrl(
    workbench?.repository?.httpsPath ?? workbench?.repository?.url ?? ''
  )
  const pendingCount = pendingAgentRuns
  const startTime = jobInsertedAt
    ? formatDateTime(jobInsertedAt, 'HH:mm:ss [UTC]', false, true)
    : null
  const workbenchPath =
    workbenchId && workbenchJobId
      ? getWorkbenchJobAbsPath({ workbenchId, jobId: workbenchJobId })
      : workbenchId
        ? getWorkbenchAbsPath(workbenchId)
        : undefined

  const detailRows = workbenchJobId
    ? [
        owner ? { label: 'Owner', value: owner } : null,
        startTime ? { label: 'Start time', value: startTime } : null,
      ].filter(isDetailRow)
    : [
        cluster ? { label: 'Cluster', value: cluster } : null,
        owner ? { label: 'Owner', value: owner } : null,
        repo ? { label: 'Repo', value: repo } : null,
      ].filter(isDetailRow)

  return (
    <CardSC>
      <HeaderSC>
        <IconWrapSC>
          <WorkbenchIcon size={16} />
        </IconWrapSC>
        <CaptionP
          $color="text"
          css={{ ...theme.partials.text.body2Bold }}
        >
          {workbenchName}
        </CaptionP>
      </HeaderSC>
      <ContentSC>
        {(detailRows.length > 0 || (!workbenchJobId && pendingCount > 0)) && (
          <Flex
            direction="column"
            gap="xsmall"
          >
            {detailRows.map(({ label, value }) => (
              <DetailRow
                key={label}
                label={label}
                value={value}
              />
            ))}
            {!workbenchJobId && pendingCount > 0 && (
              <Flex
                align="center"
                justify="space-between"
                gap="medium"
              >
                <CaptionP $color="text-xlight">Agent runs</CaptionP>
                <CaptionP css={{ color: theme.colors.yellow[300] }}>
                  {pendingCount} pending
                </CaptionP>
              </Flex>
            )}
          </Flex>
        )}
        {workbenchPath && (
          <Button
            small
            secondary
            width="100%"
            as={Link}
            to={workbenchPath}
            onClick={(event) => {
              event.stopPropagation()
              onNavigate?.()
            }}
            endIcon={<ArrowTopRightIcon />}
          >
            {workbenchJobId ? 'Open workbench job' : 'Open workbench'}
          </Button>
        )}
      </ContentSC>
    </CardSC>
  )
}

function isDetailRow(
  row: { label: string; value: string } | null
): row is { label: string; value: string } {
  return row != null
}

const CardSC = styled.div(({ theme }) => ({
  width: WORKBENCH_LINK_HOVER_CARD_WIDTH,
  maxWidth: WORKBENCH_LINK_HOVER_CARD_WIDTH,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.colors['fill-one'],
  border: theme.borders['fill-two'],
  borderRadius: 6,
  boxShadow: theme.boxShadows.moderate,
  overflow: 'hidden',
  pointerEvents: 'auto',
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  padding: 10,
  borderBottom: theme.borders['fill-two'],
}))

const IconWrapSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  flexShrink: 0,
})

const ContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.small,
}))
