import { Chip, Modal, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { CanaryFragment, Deployment, Ingress } from 'generated/graphql'

import { InlineLink } from 'components/utils/typography/InlineLink'

import { MetadataBase } from '../ComponentMetadata'

import { ComponentDetailsContext } from '../ComponentDetails'
import { InfoSection, PaddedCard, PropGroup, PropWideBold } from './common'
import { ConditionsTable } from './Conditions'
import { DeploymentBase } from './Deployment'
import { IngressBase } from './Ingress'

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
  cell: function Cell({ row: { original }, getValue }) {
    const [isOpen, setIsOpen] = useState(false)
    const theme = useTheme()

    return (
      <>
        <InlineLink
          onClick={(e) => {
            e.preventDefault()
            setIsOpen((val) => !val)
          }}
        >
          {getValue()}
        </InlineLink>
        <Modal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          header={`Deployment – ${original.metadata.name}`}
          size="large"
        >
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.large,
            }}
          >
            <DeploymentBase deployment={original} />
            <MetadataBase
              component={original}
              metadata={original.metadata}
            />
          </div>
        </Modal>
      </>
    )
  },
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
  cell: function Cell({ row: { original }, getValue }) {
    const [isOpen, setIsOpen] = useState(false)
    const theme = useTheme()

    return (
      <>
        <InlineLink
          onClick={(e) => {
            e.preventDefault()
            setIsOpen((val) => !val)
          }}
        >
          {getValue()}
        </InlineLink>
        <Modal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          header={`Ingress – ${original.metadata.name}`}
          size="large"
        >
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.large,
            }}
          >
            <IngressBase ingress={original} />
            <MetadataBase
              component={original}
              metadata={original.metadata}
            />
          </div>
        </Modal>
      </>
    )
  },
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

function CanaryDeployments({ canary }: { canary: CanaryFragment }) {
  return (
    <InfoSection
      title="Deployments"
      headerSize={3}
    >
      <Table
        data={[canary.primaryDeployment, canary.canaryDeployment].filter(
          (v) => !!v
        )}
        columns={depColumns}
      />
    </InfoSection>
  )
}

function CanaryIngresses({ canary }: { canary: CanaryFragment }) {
  const ingresses = useMemo(
    () => [canary.ingress, canary.ingressCanary].filter((v) => !!v),
    [canary.ingress, canary.ingressCanary]
  )

  return (
    <InfoSection
      title="Ingresses"
      headerSize={3}
    >
      <Table
        data={ingresses}
        columns={ingressColumns}
      />
    </InfoSection>
  )
}

export default function CanaryInfo() {
  const theme = useTheme()
  const { componentDetails: canary } =
    useOutletContext<ComponentDetailsContext>()

  if (canary?.__typename !== 'Canary') return null

  const { status } = canary

  return (
    <>
      <InfoSection title="References">
        <CanaryDeployments canary={canary} />
        <CanaryIngresses canary={canary} />
      </InfoSection>
      <InfoSection title="Status">
        <PaddedCard>
          <PropGroup>
            <PropWideBold title="Failed Checks">
              {status?.failedChecks || 0}
            </PropWideBold>
            <PropWideBold title="Canary Weight">
              {status?.canaryWeight || 0}
            </PropWideBold>
            <PropWideBold title="Iterations">
              {status?.iterations || 0}
            </PropWideBold>
          </PropGroup>
        </PaddedCard>
      </InfoSection>
      <div css={{ marginTop: theme.spacing.medium }}>
        <ConditionsTable conditions={status?.conditions} />
      </div>
    </>
  )
}
