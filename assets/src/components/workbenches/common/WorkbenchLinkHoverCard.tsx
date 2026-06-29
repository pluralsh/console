import {
  ArrowTopRightIcon,
  Button,
  Card,
  Flex,
  prettifyRepoUrl,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import { WorkbenchLinkCardFragment } from 'generated/graphql'
import { Link } from 'react-router-dom'
import { getWorkbenchAbsPath } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'

export const WORKBENCH_LINK_HOVER_CARD_WIDTH = 220

type WorkbenchLinkHoverCardProps = {
  workbenchName: string
  workbenchId?: string
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
        $color="text-light"
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

  return (
    <CardSC fillLevel={2}>
      <Flex
        align="center"
        gap="xsmall"
      >
        <WorkbenchIcon size={16} />
        <CaptionP
          $color="text"
          css={{ ...theme.partials.text.body2Bold }}
        >
          {workbenchName}
        </CaptionP>
      </Flex>
      <DividerSC />
      <Flex
        direction="column"
        gap="xsmall"
      >
        {cluster && (
          <DetailRow
            label="Cluster"
            value={cluster}
          />
        )}
        {owner && (
          <DetailRow
            label="Owner"
            value={owner}
          />
        )}
        {repo && (
          <DetailRow
            label="Repo"
            value={repo}
          />
        )}
        {pendingCount > 0 && (
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
      {workbenchId && (
        <Button
          small
          secondary
          width="100%"
          as={Link}
          to={getWorkbenchAbsPath(workbenchId)}
          onClick={(event) => {
            event.stopPropagation()
            onNavigate?.()
          }}
          endIcon={<ArrowTopRightIcon />}
        >
          Open workbench
        </Button>
      )}
    </CardSC>
  )
}

const CardSC = styled(Card)(({ theme }) => ({
  '&&': {
    width: WORKBENCH_LINK_HOVER_CARD_WIDTH,
    maxWidth: WORKBENCH_LINK_HOVER_CARD_WIDTH,
    flexGrow: 0,
  },
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
  border: theme.borders['fill-two'],
  pointerEvents: 'auto',
}))

const DividerSC = styled.div(({ theme }) => ({
  borderTop: `1px solid ${theme.colors['border-fill-two']}`,
  marginLeft: -theme.spacing.medium,
  marginRight: -theme.spacing.medium,
  flexShrink: 0,
}))
