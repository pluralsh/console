import { Divider, Flex, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { Fragment } from 'react'
import { useOutletContext } from 'react-router-dom'

import { isNonNullable } from 'utils/isNonNullable'
import { ComponentDetailsContext } from '../ComponentDetails'
import { InfoSection, InfoSectionH3, PaddedCard, PropWideBold } from './common'
import { ServicePort } from 'generated/graphql'
import { LabelSelector } from 'components/kubernetes/common/LabelSelector'

const COLUMN_HELPER = createColumnHelper<ServicePort>()

const PORT_COLUMNS = [
  COLUMN_HELPER.accessor((row) => row.name, {
    id: 'name',
    cell: (prop) => prop.getValue() || '-',
    header: 'Name',
  }),
  COLUMN_HELPER.accessor((row) => row.protocol, {
    id: 'protocol',
    cell: (prop) => prop.getValue(),
    header: 'Protocol',
  }),
  COLUMN_HELPER.accessor((row) => row.port, {
    id: 'port',
    cell: (prop) => prop.getValue(),
    header: 'Port',
  }),
  COLUMN_HELPER.accessor((row) => row.targetPort, {
    id: 'targetPort',
    cell: (prop) => prop.getValue(),
    header: 'Target port',
  }),
]

export default function Service() {
  const { componentDetails: service } =
    useOutletContext<ComponentDetailsContext>()

  if (service?.__typename !== 'Service') return null

  const loadBalancer = service.status?.loadBalancer
  const ingressEntries = loadBalancer?.ingress?.filter(isNonNullable) ?? []

  const ports = service.spec?.ports?.filter(isNonNullable) ?? []

  return (
    <Flex
      direction="column"
      gap="large"
      grow={1}
    >
      {!isEmpty(ports) && (
        <>
          <InfoSectionH3>Ports</InfoSectionH3>
          <Table
            data={ports}
            columns={PORT_COLUMNS}
          />
        </>
      )}
      <Flex
        direction="row"
        gap="large"
      >
        {!isEmpty(ingressEntries) && (
          <InfoSection title="Status">
            <PaddedCard>
              {ingressEntries.map((entry, i) => (
                <Fragment key={i}>
                  {i !== 0 && (
                    <Divider
                      backgroundColor="border-input"
                      margin="xsmall"
                    />
                  )}
                  {entry.ip && (
                    <PropWideBold title="IP">{entry.ip}</PropWideBold>
                  )}
                  {entry.hostname && (
                    <PropWideBold title="Hostname">
                      {entry.hostname}
                    </PropWideBold>
                  )}
                </Fragment>
              ))}
            </PaddedCard>
          </InfoSection>
        )}
        <InfoSection title="Spec">
          <PaddedCard>
            <PropWideBold title="Type">{service.spec?.type}</PropWideBold>
            <PropWideBold title="Cluster IP">
              {service.spec?.clusterIp || '-'}
            </PropWideBold>
            <PropWideBold title="Session Affinity">
              {service.spec?.sessionAffinity || '-'}
            </PropWideBold>
            <PropWideBold title="Selector">
              <LabelSelector
                selector={{
                  matchLabels: service.spec?.selector as Record<string, string>,
                }}
              />
            </PropWideBold>
          </PaddedCard>
        </InfoSection>
      </Flex>
    </Flex>
  )
}
