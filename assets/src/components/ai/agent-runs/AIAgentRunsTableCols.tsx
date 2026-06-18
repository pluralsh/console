import {
  CaretRightIcon,
  Chip,
  IconFrame,
  IconFrameProps,
  Modal,
  PrClosedIcon,
  PrMergedIcon,
  PrOpenIcon,
  SmallPodIcon,
  Table,
  WorkbenchIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import {
  ColInsertedAt,
  ColLinkout,
  ColStatus,
  ColTitle,
} from 'components/self-service/pr/queue/PrQueueColumns'
import { AgentRuntimeIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { TRUNCATE } from 'components/utils/truncate'
import { Body2P, SpanSC } from 'components/utils/typography/Text'
import {
  AgentRunTinyFragment,
  PrStatus,
  PullRequestBasicFragment,
} from 'generated/graphql'
import { capitalize, isEmpty, toLower } from 'lodash'
import { useMemo, useState } from 'react'
import { Link, LinkProps } from 'react-router-dom'
import { getPodDetailsPath } from 'routes/cdRoutesConsts'
import { getWorkbenchJobAbsPath } from 'routes/workbenchesRoutesConsts'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { RunStatusChip } from '../infra-research/details/InfraResearch'

const columnHelper = createColumnHelper<AgentRunTinyFragment>()

export const agentRunsCols = [
  columnHelper.accessor((run) => run.runtime?.type, {
    id: 'runtime',
    cell: ({ getValue }) => <AgentRuntimeIcon type={getValue()} />,
  }),
  columnHelper.accessor((run) => run.prompt, {
    id: 'prompt',
    meta: { gridTemplate: 'minmax(0, 1fr)' },
    cell: function Cell({ getValue }) {
      return (
        <div css={{ overflow: 'hidden', width: '100%' }}>
          <Body2P css={TRUNCATE}>{getValue()}</Body2P>
        </div>
      )
    },
  }),
  columnHelper.accessor((run) => run.workbenchJob, {
    id: 'workbench',
    cell: function Cell({ getValue }) {
      const workbenchJob = getValue()
      const workbench = workbenchJob?.workbench
      if (!workbenchJob?.id || !workbench?.id || !workbench.name) return null

      return (
        <Chip
          size="small"
          severity="neutral"
          fillLevel={1}
          clickable
          as={Link}
          to={getWorkbenchJobAbsPath({
            workbenchId: workbench.id,
            jobId: workbenchJob.id,
          })}
          onClick={(e) => e.stopPropagation()}
          icon={<WorkbenchIcon size={12} />}
          truncateWidth={80}
          tooltip="View workbench job"
        >
          {workbench.name}
        </Chip>
      )
    },
  }),
  columnHelper.accessor((run) => run.pullRequests, {
    id: 'pullRequests',
    cell: function Cell({ getValue }) {
      return <PRsModalIcon prs={getValue()?.filter(isNonNullable) ?? []} />
    },
  }),
  columnHelper.accessor((run) => run, {
    id: 'podReference',
    cell: function Cell({ getValue }) {
      const { id, podReference } = getValue()
      if (!podReference) return null

      return (
        <IconFrame
          type="secondary"
          clickable
          tooltip="View pod details"
          icon={<SmallPodIcon color="icon-light" />}
          as={Link}
          to={getPodDetailsPath({
            type: 'agent-run',
            agentRunId: id,
            name: podReference.name,
            namespace: podReference.namespace,
          })}
        />
      )
    },
  }),
  columnHelper.accessor((run) => run.mode, {
    id: 'mode',
    enableSorting: true,
    cell: ({ getValue }) => (
      <Chip
        severity="info"
        css={{ alignSelf: 'flex-end' }}
      >
        {capitalize(getValue())}
      </Chip>
    ),
  }),
  columnHelper.accessor((run) => run.status, {
    id: 'status',
    enableSorting: true,
    cell: function Cell({ getValue }) {
      return (
        <RunStatusChip
          fillLevel={2}
          status={getValue()}
          css={{ alignSelf: 'flex-end' }}
        />
      )
    },
  }),
  columnHelper.display({
    id: 'actions',
    cell: function Cell() {
      return (
        <IconFrame
          clickable
          tooltip="View  details"
          icon={<CaretRightIcon />}
        />
      )
    },
  }),
]

export function PRsModalIcon({
  prs,
  ...props
}: {
  prs: PullRequestBasicFragment[]
} & Partial<IconFrameProps & LinkProps>) {
  const theme = useTheme()
  const [modalOpen, setModalOpen] = useState(false)

  const basicPrTableCols = useMemo(
    () => [ColTitle, ColStatus, ColInsertedAt, ColLinkout],
    []
  )

  if (isEmpty(prs)) return null
  if (prs.length === 1) {
    const singlePrStatus = prs[0].status ?? PrStatus.Open
    const icon =
      singlePrStatus === PrStatus.Merged ? (
        <PrMergedIcon color={theme.colors['code-block-purple']} />
      ) : singlePrStatus === PrStatus.Closed ? (
        <PrClosedIcon color="icon-danger" />
      ) : (
        <PrOpenIcon color="icon-success" />
      )

    return (
      <IconFrame
        clickable
        type="secondary"
        as={Link}
        to={prs[0].url}
        target="_blank"
        rel="noopener noreferrer"
        tooltip={`View ${toLower(singlePrStatus)} pull request`}
        icon={icon}
        {...props}
      />
    )
  }

  return (
    <>
      <Chip
        clickable
        size="small"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setModalOpen(true)
        }}
        tooltip="View pull requests"
        fillLevel={0}
      >
        <SpanSC $color="text-xlight">{prs.length}</SpanSC>{' '}
        <SpanSC $color="text-light">PRs</SpanSC>
      </Chip>
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        header="Pull Requests"
        size="auto"
      >
        <Table
          data={prs.map((pr) => ({ node: pr }))}
          columns={basicPrTableCols}
        />
      </Modal>
    </>
  )
}
