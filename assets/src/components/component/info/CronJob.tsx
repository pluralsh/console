import { Table, Tooltip } from '@pluralsh/design-system'
import { Row, createColumnHelper } from '@tanstack/react-table'
import { TableText } from 'components/cluster/TableElements'
import { useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { ComponentDetailsContext } from '../ComponentDetails'

import { Kind } from 'components/kubernetes/common/types'
import { getResourceDetailsAbsPath } from 'routes/kubernetesRoutesConsts'
import { DeleteJob } from './Job'
import { InfoSection, PaddedCard, PropWideBold } from './common'
import { CronJobJobFragment, CronJobQuery } from 'generated/graphql'

const columnHelper = createColumnHelper<any>()

const getColumns = (namespace, refetch) => [
  columnHelper.accessor((row) => row?.metadata?.name, {
    id: 'name',
    cell: (props) => (
      <Tooltip
        label={props.getValue()}
        placement="top-start"
      >
        <TableText>{props.getValue()}</TableText>
      </Tooltip>
    ),
    header: 'Name',
  }),
  columnHelper.accessor((row) => row?.status, {
    id: 'startEnd',
    cell: (props) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const theme = useTheme()
      const status = props.getValue()

      return (
        <div>
          <div>{status?.startTime}</div>
          <div
            css={{
              ...theme.partials.text.caption,
              color: theme.colors['text-xlight'],
            }}
          >
            {status.completionTime}
          </div>
        </div>
      )
    },
    header: 'Start / Completion time',
  }),
  columnHelper.accessor((row) => row?.status?.active || 0, {
    id: 'active',
    cell: (props) => props.getValue(),
    header: 'Active',
  }),
  columnHelper.accessor((row) => row?.status?.failed || 0, {
    id: 'failed',
    cell: (props) => props.getValue(),
    header: 'Failed',
  }),
  columnHelper.accessor((row) => row?.status?.succeeded || 0, {
    id: 'succeeded',
    cell: (props) => props.getValue(),
    header: 'Succeeded',
  }),
  columnHelper.accessor((row) => row?.metadata?.name, {
    id: 'delete',
    cell: (props) => (
      <DeleteJob
        name={props.getValue()}
        namespace={namespace}
        refetch={refetch}
      />
    ),
    header: '',
  }),
]

function CronJobJobs({
  jobs,
  namespace,
  refetch,
}: {
  jobs: Nullable<CronJobJobFragment>[]
  namespace: Nullable<string>
  refetch: () => void
}) {
  const navigate = useNavigate()
  const columns = useMemo(
    () => getColumns(namespace, refetch),
    [namespace, refetch]
  )
  const { cluster } = useOutletContext<ComponentDetailsContext>()

  const filteredJobs = jobs.filter((job): job is CronJobJobFragment => !!job)

  return (
    <Table
      data={filteredJobs}
      columns={columns}
      onRowClick={(_e, { original }: Row<CronJobJobFragment>) => {
        const jobPath = getResourceDetailsAbsPath(
          cluster?.id,
          Kind.CronJob,
          original?.metadata.name,
          namespace
        )
        if (jobPath) navigate(jobPath)
      }}
    />
  )
}

export default function CronJob() {
  const { data, refetch, component } =
    useOutletContext<ComponentDetailsContext>()
  const namespace = component.namespace?.toLowerCase()

  if (!data?.cronJob) return null

  const { cronJob } = data as CronJobQuery

  return (
    <>
      <InfoSection title="Jobs">
        <CronJobJobs
          jobs={cronJob?.jobs ?? []}
          namespace={namespace}
          refetch={refetch}
        />
      </InfoSection>
      <InfoSection title="Status">
        <PaddedCard>
          <PropWideBold title="Last scheduled">
            {cronJob?.status?.lastScheduleTime || 0}
          </PropWideBold>
        </PaddedCard>
      </InfoSection>
      <InfoSection title="Spec">
        <PaddedCard>
          <PropWideBold title="Schedule">
            {cronJob?.spec?.schedule || '-'}
          </PropWideBold>
          <PropWideBold title="Concurrency">
            {cronJob?.spec?.concurrencyPolicy || '-'}
          </PropWideBold>
          <PropWideBold title="Suspended">
            {cronJob?.spec?.suspend ? 'Yes' : 'No'}
          </PropWideBold>
        </PaddedCard>
      </InfoSection>
    </>
  )
}
