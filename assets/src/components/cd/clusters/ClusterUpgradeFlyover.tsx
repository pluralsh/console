import { ApolloError } from '@apollo/client'
import {
  Accordion,
  AccordionItem,
  AppIcon,
  ChecklistIcon,
  Chip,
  ConfettiIcon,
  Flyover,
  SuccessIcon,
  Tab,
  TabList,
  Table,
} from '@pluralsh/design-system'
import {
  ClustersRowFragment,
  UpgradeInsight,
  UpgradeInsightStatus,
  useRuntimeServicesQuery,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import React, { useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'

import { IconProps } from '@pluralsh/design-system/dist/components/icons/createIcon'

import { GqlError } from '../../utils/Alert'

import { deprecationsColumns } from './deprecationsColumns'
import RuntimeServices, {
  getClusterKubeVersion,
} from './runtime/RuntimeServices'
import { clusterUpgradeColumns } from './clusterUpgradeColumns'
import { upgradeInsightsColumns } from './upgradeInsightsColumns'

const POLL_INTERVAL = 10 * 1000

export enum DeprecationType {
  GitOps = 'gitOps',
  CloudProvider = 'cloudProvider',
}

function DeprecationCountChip({ count }: { count: number }) {
  return (
    <Chip
      size="small"
      severity={count === 0 ? 'neutral' : 'warning'}
    >
      {count}
    </Chip>
  )
}

function FlyoverContent({ open, cluster, refetch }) {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const [deprecationType, setDeprecationType] = useState(DeprecationType.GitOps)
  const [upgradeError, setError] = useState<Nullable<ApolloError>>(undefined)

  const kubeVersion = getClusterKubeVersion(cluster)
  const { data, error } = useRuntimeServicesQuery({
    variables: {
      kubeVersion,
      hasKubeVersion: true,
      id: cluster?.id ?? '',
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    skip: !open,
  })

  const runtimeServices = data?.cluster?.runtimeServices
  const apiDeprecations = data?.cluster?.apiDeprecations
  const upgradeInsights: UpgradeInsight[] = [
    {
      id: '1',
      name: 'Deprecated APIs removed in Kubernetes v1.32',
      status: UpgradeInsightStatus.Failed,
      version: '1.32',
      refreshedAt: '2024-08-23T06:52:01.430Z',
      transitionedAt: '2024-08-23T06:52:01.430Z',
    },
  ] // TODO  data?.cluster?.upgradeInsights

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      {(upgradeError || error) && (
        <GqlError
          header={
            upgradeError
              ? 'Could not upgrade cluster'
              : 'Failed to fetch upgrade plan'
          }
          error={upgradeError || error}
        />
      )}
      <Table
        data={[cluster]}
        columns={clusterUpgradeColumns}
        css={{
          maxHeight: 'unset',
          height: '100%',
        }}
        reactTableOptions={{
          meta: { refetch, setError, data },
        }}
      />
      <Accordion
        type="single"
        fillLevel={1}
      >
        <AccordionItem
          paddingArea="trigger-only"
          trigger={
            <ClusterUpgradeAccordionTrigger
              checked={cluster?.upgradePlan?.deprecations || false}
              icon={ChecklistIcon}
              title="Check API deprecations"
              subtitle="Ensure that all K8s YAML you're deploying is conformant with the next K8s version"
            />
          }
        >
          <div
            css={{
              display: 'flex',
              flexGrow: 1,
            }}
          >
            <TabList
              css={{ flexGrow: 1 }}
              stateRef={tabStateRef}
              stateProps={{
                orientation: 'horizontal',
                selectedKey: deprecationType,
                onSelectionChange: setDeprecationType as any,
              }}
            >
              <Tab
                key={DeprecationType.GitOps}
                innerProps={{
                  flexGrow: 1,
                  gap: theme.spacing.xsmall,
                  justifyContent: 'center',
                }}
                css={{ display: 'flex', flexGrow: 1 }}
              >
                <div>Detected by GitOps</div>
                <DeprecationCountChip count={apiDeprecations?.length ?? 0} />
              </Tab>
              <Tab
                key={DeprecationType.CloudProvider}
                innerProps={{
                  flexGrow: 1,
                  gap: theme.spacing.xsmall,
                  justifyContent: 'center',
                }}
                css={{ display: 'flex', flexGrow: 1 }}
              >
                Detected by Cloud Provider
                <DeprecationCountChip count={upgradeInsights?.length ?? 0} />
              </Tab>
            </TabList>
          </div>
          {deprecationType === DeprecationType.GitOps && (
            <div>
              {!isEmpty(apiDeprecations) ? (
                <Table
                  flush
                  data={apiDeprecations || []}
                  columns={deprecationsColumns}
                  css={{
                    maxHeight: 181,
                    height: '100%',
                  }}
                />
              ) : (
                <EmptyState description="No services with API deprecations discovered!" />
              )}
            </div>
          )}
          {deprecationType === DeprecationType.CloudProvider && (
            <div>
              {!isEmpty(upgradeInsights) ? (
                <Table
                  flush
                  data={upgradeInsights || []}
                  columns={upgradeInsightsColumns}
                  css={{
                    maxHeight: 181,
                    height: '100%',
                  }}
                />
              ) : (
                <EmptyState description="No services with cloud provider insights discovered!" />
              )}
            </div>
          )}
        </AccordionItem>
      </Accordion>
      <Accordion
        type="single"
        fillLevel={1}
      >
        <AccordionItem
          paddingArea="trigger-only"
          trigger={
            <ClusterUpgradeAccordionTrigger
              checked={cluster?.upgradePlan?.compatibilities || false}
              icon={ChecklistIcon}
              title="Check add-on compatibilities"
              subtitle="Ensure all known third-party add-ons are supported on the next K8s version"
            />
          }
        >
          {!isEmpty(runtimeServices) ? (
            <RuntimeServices
              flush
              data={data}
            />
          ) : (
            <EmptyState description="No known add-ons found" />
          )}
        </AccordionItem>
      </Accordion>
      <Accordion
        type="single"
        fillLevel={1}
      >
        <AccordionItem
          paddingArea="trigger-only"
          trigger={
            <ClusterUpgradeAccordionTrigger
              checked={cluster?.upgradePlan?.incompatibilities || false}
              icon={ChecklistIcon}
              title="Check add-on mutual incompatibilities"
              subtitle="Use suggested version for each add-on to resolve mutual incompatibilities"
            />
          }
        >
          <EmptyState description="No mutually incompatible add-ons detected!" />
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export function ClusterUpgradeFlyover({
  open,
  onClose,
  cluster,
  refetch,
}: {
  open: boolean
  onClose: () => void
  cluster: ClustersRowFragment | null | undefined
  refetch: Nullable<() => void>
}) {
  const theme = useTheme()

  return (
    <Flyover
      header={`Upgrade Plan for ${cluster?.name}`}
      open={open}
      onClose={onClose}
      minWidth={920}
      borderRadius={0}
      borderLeft={theme.borders.default}
      boxShadow={theme.boxShadows.modal}
    >
      <FlyoverContent
        open={open}
        cluster={cluster}
        refetch={refetch}
      />
    </Flyover>
  )
}

function EmptyState({ description }) {
  const theme = useTheme()

  return (
    <div
      css={{
        padding: theme.spacing.medium,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.small,
      }}
    >
      <ConfettiIcon
        size={32}
        color={theme.colors['icon-success']}
      />
      <span>{description}</span>
    </div>
  )
}

function ClusterUpgradeAccordionTrigger({
  icon: Icon,
  title,
  subtitle,
  checked,
}: {
  icon: React.ComponentType<IconProps>
  title: string
  subtitle?: string
  checked: boolean
}) {
  const theme = useTheme()

  return (
    <TriggerWrapperSC>
      <AppIcon
        spacing="padding"
        size="xxsmall"
        icon={
          checked ? (
            <SuccessIcon color="icon-success" />
          ) : (
            <Icon color="icon-warning" />
          )
        }
      />
      <div css={{ display: 'flex', flexDirection: 'column' }}>
        <span css={theme.partials.text.body1Bold}>{title}</span>
        <span
          css={{
            ...theme.partials.text.body2,
            color: theme.colors['text-light'],
          }}
        >
          {subtitle}
        </span>
      </div>
    </TriggerWrapperSC>
  )
}

const TriggerWrapperSC = styled.div(({ theme }) => ({
  gap: theme.spacing.large,
  cursor: 'pointer',
  fontSize: '18px',
  display: 'flex',
  alignItems: 'center',
}))
