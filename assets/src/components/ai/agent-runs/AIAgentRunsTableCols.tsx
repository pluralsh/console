import {
  CaretRightIcon,
  Chip,
  IconFrame,
  Modal,
  PrOpenIcon,
  SmallPodIcon,
  Table,
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
import { Body2P } from 'components/utils/typography/Text'
import { AgentRunTinyFragment } from 'generated/graphql'
import { capitalize, isEmpty } from 'lodash'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getPodDetailsPath } from 'routes/cdRoutesConsts'
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
  columnHelper.accessor((run) => run.pullRequests, {
    id: 'pullRequests',
    cell: function Cell({ getValue }) {
      const [modalOpen, setModalOpen] = useState(false)
      const prs = getValue()?.filter(isNonNullable) ?? []
      if (isEmpty(prs)) return null
      if (prs.length === 1)
        return (
          <IconFrame
            clickable
            type="secondary"
            as={Link}
            to={prs[0].url}
            target="_blank"
            rel="noopener noreferrer"
            tooltip="View pull request"
            icon={<PrOpenIcon />}
          />
        )
      return (
        <>
          <IconFrame
            clickable
            type="secondary"
            tooltip="View pull requests"
            icon={<PrOpenIcon />}
            onClick={() => setModalOpen(true)}
          />
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

const basicPrTableCols = [ColTitle, ColStatus, ColInsertedAt, ColLinkout]
