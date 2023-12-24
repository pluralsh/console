import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { createColumnHelper } from '@tanstack/react-table'

import { Canary, Deployment, Ingress } from 'generated/graphql'

import { Chip, Table } from '@pluralsh/design-system'

import {
  InfoSectionH2,
  InfoSectionH3,
  PaddedCard,
  PropWideBold,
} from './common'
import { ConditionsTable } from './Conditions'

const deploymentHelper = createColumnHelper<Deployment>()
const ingressHelper = createColumnHelper<Ingress>()

function StatusChip({ healthy }) {
  return (
    <Chip severity={healthy ? 'success' : 'warning'}>
      {healthy ? 'Healthy' : 'Pending'}
    </Chip>
  )
}

const ColDepName = deploymentHelper.accessor((row) => row.metadata?.name, {
  id: 'name',
  header: 'Name',
  cell: ({ getValue }) => getValue(),
})

const ColDepStatus = deploymentHelper.accessor((row) => row.status, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => {
    const status = getValue()

    if (!status) return null
    const healthy = status.replicas === status.availableReplicas

    return <StatusChip healthy={healthy} />
  },
})

const ColDepAvailable = deploymentHelper.accessor(
  (row) => row.status?.availableReplicas,
  {
    id: 'available',
    header: 'Available',
    cell: ({ getValue }) => getValue(),
  }
)

const ColDepReplicas = deploymentHelper.accessor(
  (row) => row.status?.replicas,
  {
    id: 'replicas',
    header: 'Replicas',
    cell: ({ getValue }) => getValue(),
  }
)

const depColumns = [ColDepName, ColDepStatus, ColDepReplicas, ColDepAvailable]

const ColIngName = ingressHelper.accessor((row) => row.metadata?.name, {
  id: 'name',
  header: 'Name',
  cell: ({ getValue }) => getValue(),
})

const ColIngStatus = ingressHelper.accessor((row) => row.status, {
  id: 'status',
  header: 'Status',
  cell: ({ getValue }) => {
    const status = getValue()

    if (!status) return null
    const healthy = (status?.loadBalancer?.ingress?.length || 0) > 0

    return <StatusChip healthy={healthy} />
  },
})

const ColIngClass = ingressHelper.accessor(
  (row) => row.spec?.ingressClassName,
  {
    id: 'class',
    header: 'Class',
    cell: ({ getValue }) => getValue(),
  }
)

const ingressColumns = [ColIngName, ColIngStatus, ColIngClass]

function CanaryDeployments({ canary }: { canary: Canary }) {
  const theme = useTheme()

  return (
    <>
      <InfoSectionH3
        css={{
          marginBottom: theme.spacing.medium,
          marginTop: theme.spacing.large,
        }}
      >
        Deployments
      </InfoSectionH3>
      <Table
        data={[canary.primaryDeployment, canary.canaryDeployment].filter(
          (v) => !!v
        )}
        columns={depColumns}
      />
    </>
  )
}

function CanaryIngresses({ canary }: { canary: Canary }) {
  const theme = useTheme()

  return (
    <>
      <InfoSectionH3
        css={{
          marginBottom: theme.spacing.medium,
          marginTop: theme.spacing.large,
        }}
      >
        Ingresses
      </InfoSectionH3>
      <Table
        data={[canary.ingress, canary.ingressCanary].filter((v) => !!v)}
        columns={ingressColumns}
      />
    </>
  )
}

export default function CanaryInfo() {
  const theme = useTheme()
  const { data } = useOutletContext<any>()
  const canary = data?.canary as Nullable<Canary>

  if (!canary) return null

  const { status } = canary

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
      }}
    >
      <InfoSectionH2>References</InfoSectionH2>
      <CanaryDeployments canary={canary} />
      <CanaryIngresses canary={canary} />
      <InfoSectionH2
        css={{
          marginBottom: theme.spacing.medium,
          marginTop: theme.spacing.medium,
        }}
      >
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
              flexDirection: 'column',
              flexGrow: 1,
              justifyContent: 'center',
            }}
          >
            <PropWideBold title="Failed Checks">
              {status?.failedChecks || 0}
            </PropWideBold>
            <PropWideBold title="Canary Weight">
              {status?.canaryWeight || 0}
            </PropWideBold>
            <PropWideBold title="Iterations">
              {status?.iterations || 0}
            </PropWideBold>
          </div>
        </div>
      </PaddedCard>
      <div css={{ marginTop: theme.spacing.medium }}>
        <ConditionsTable conditions={status?.conditions} />
      </div>
    </div>
  )
}
