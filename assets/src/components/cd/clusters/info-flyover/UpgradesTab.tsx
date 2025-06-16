import { ApolloError } from '@apollo/client'
import {
  Accordion,
  AccordionItem,
  AppIcon,
  ChecklistIcon,
  Chip,
  ChipProps,
  ConfettiIcon,
  IconProps,
  SuccessIcon,
  Tab,
  Table,
  TabList,
  WarningIcon,
} from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import {
  ClusterDistro,
  ClusterUpgradePlanFragment,
  UpgradeInsight,
  UpgradeInsightStatus,
  useClusterUpgradeQuery,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { ComponentType, useMemo, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'

import { GqlError } from '../../../utils/Alert.tsx'

import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment.tsx'
import { produce } from 'immer'
import { ClusterDistroShortNames } from '../../../utils/ClusterDistro.tsx'
import LoadingIndicator from '../../../utils/LoadingIndicator.tsx'
import { clusterDeprecatedCustomResourcesColumns } from '../clusterDeprecatedCustomResourcesColumns.tsx'
import { getClusterUpgradeInfo } from '../ClusterUpgradeButton.tsx'
import {
  clusterPreFlightCols,
  clusterUpgradeColumns,
  initialClusterPreFlightItems,
} from '../clusterUpgradeColumns.tsx'
import { deprecationsColumns } from '../deprecationsColumns.tsx'
import CloudAddons from '../runtime/CloudAddons.tsx'
import RuntimeServices from '../runtime/RuntimeServices.tsx'
import {
  UpgradeInsightExpansionPanel,
  upgradeInsightsColumns,
} from '../UpgradeInsights.tsx'
import { runAfterBrowserLayout } from 'utils/runAfterBrowserLayout.ts'

enum DeprecationType {
  GitOps = 'gitOps',
  CloudProvider = 'cloudProvider',
}

enum AddonType {
  All = 'all',
  Cloud = 'cloud',
}

export enum UpgradeAccordionName {
  Preflight = 'preflight',
  Deprecations = 'deprecations',
  AddOns = 'add-ons',
  CustomResources = 'custom-resources',
}

function DeprecationCountChip({
  count,
  ...props
}: { count: number } & ChipProps) {
  return (
    <Chip
      size="small"
      severity={count === 0 ? 'neutral' : 'warning'}
      {...props}
    >
      {count}
    </Chip>
  )
}

const statesWithIssues = [
  UpgradeInsightStatus.Warning,
  UpgradeInsightStatus.Failed,
]

export function UpgradesTab({
  clusterId,
  kubeVersion,
  refetch,
  initialOpen,
}: {
  clusterId: string
  kubeVersion: string
  refetch: Nullable<() => void>
  initialOpen?: UpgradeAccordionName | undefined
}) {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const [scrolledIntoView, setScrolledIntoView] = useState(false)

  const [addonType, setAddonType] = useState(AddonType.All)
  const [deprecationType, setDeprecationType] = useState(DeprecationType.GitOps)
  const [upgradeError, setError] = useState<Nullable<ApolloError>>(undefined)

  const { data, error } = useClusterUpgradeQuery({
    variables: {
      kubeVersion,
      hasKubeVersion: true,
      id: clusterId,
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const cluster = data?.cluster

  const { numUpgradeBlockers } = getClusterUpgradeInfo(cluster)

  const runtimeServices = cluster?.runtimeServices
  const cloudAddons = cluster?.cloudAddons
  const apiDeprecations = cluster?.apiDeprecations
  const upgradeInsights = cluster?.upgradeInsights

  const upgradeIssues = upgradeInsights?.filter(
    (i) => i?.status && statesWithIssues.includes(i.status)
  )

  const supportsCloudAddons = cluster?.distro === ClusterDistro.Eks

  const preFlightChecklist = useMemo(
    () => getPreFlightChecklist(cluster?.upgradePlan),
    [cluster?.upgradePlan]
  )

  const scrollOnMount = (
    domNode: HTMLDivElement | null,
    name: UpgradeAccordionName
  ) => {
    if (initialOpen === name && !scrolledIntoView) {
      runAfterBrowserLayout(() =>
        domNode?.scrollIntoView({ behavior: 'smooth' })
      )
      setScrolledIntoView(true)
    }
  }

  if (error)
    return (
      <GqlError
        header="Failed to fetch cluster upgrade plan"
        error={error}
      />
    )

  if (!cluster) return <LoadingIndicator />

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      {upgradeError && (
        <GqlError
          header="Could not upgrade cluster"
          error={upgradeError}
        />
      )}
      <Table
        data={[cluster]}
        columns={clusterUpgradeColumns}
        reactTableOptions={{
          meta: { refetch, setError, data },
        }}
      />
      <div css={{ ...theme.partials.text.body1Bold }}>
        Upgrade blockers ({numUpgradeBlockers})
      </div>
      <Accordion
        defaultValue={initialOpen}
        ref={(domNode) =>
          scrollOnMount(domNode, UpgradeAccordionName.Preflight)
        }
        type="single"
        fillLevel={1}
      >
        <AccordionItem
          value={UpgradeAccordionName.Preflight}
          paddingArea="trigger-only"
          trigger={
            <ClusterUpgradeAccordionTrigger
              checked={preFlightChecklist.every((i) => i.value)}
              icon={ChecklistIcon}
              title="Pre-flight checklist"
              subtitle="Ensure your K8s infrastructure is upgrade-ready"
            />
          }
        >
          <Table
            flush
            fillLevel={1}
            borderTop={theme.borders['fill-two']}
            rowBg="base"
            data={preFlightChecklist}
            columns={clusterPreFlightCols}
          />
        </AccordionItem>
      </Accordion>
      <Accordion
        defaultValue={initialOpen}
        type="single"
        fillLevel={1}
        ref={(domNode) =>
          scrollOnMount(domNode, UpgradeAccordionName.Deprecations)
        }
      >
        <AccordionItem
          value={UpgradeAccordionName.Deprecations}
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
                  gap: 'xsmall',
                  justifyContent: 'center',
                }}
                css={{ display: 'flex', flexGrow: 1 }}
              >
                {!isEmpty(apiDeprecations) && (
                  <WarningIcon color="icon-warning" />
                )}
                <div>Detected by GitOps</div>
                <DeprecationCountChip count={apiDeprecations?.length ?? 0} />
              </Tab>
              <Tab
                key={DeprecationType.CloudProvider}
                innerProps={{
                  flexGrow: 1,
                  gap: 'xsmall',
                  justifyContent: 'center',
                }}
                css={{ display: 'flex', flexGrow: 1 }}
              >
                {!isEmpty(upgradeIssues) && (
                  <WarningIcon color="icon-warning" />
                )}
                Detected by Cloud Provider
                <DeprecationCountChip
                  count={upgradeInsights?.length ?? 0}
                  severity={isEmpty(upgradeIssues) ? 'neutral' : 'warning'}
                />
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
                  getRowCanExpand={(row: Row<UpgradeInsight>) =>
                    row.original.description || !isEmpty(row.original.details)
                  }
                  renderExpanded={UpgradeInsightExpansionPanel}
                  css={{
                    maxHeight: 400,
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
        defaultValue={initialOpen}
        type="single"
        fillLevel={1}
        ref={(domNode) => scrollOnMount(domNode, UpgradeAccordionName.AddOns)}
      >
        <AccordionItem
          value={UpgradeAccordionName.AddOns}
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
          <div
            css={{
              display: 'flex',
              flexGrow: 1,
            }}
          >
            {supportsCloudAddons && (
              <TabList
                css={{ flexGrow: 1 }}
                stateRef={tabStateRef}
                stateProps={{
                  orientation: 'horizontal',
                  selectedKey: addonType,
                  onSelectionChange: setAddonType as any,
                }}
              >
                <Tab
                  key={AddonType.All}
                  innerProps={{
                    flexGrow: 1,
                    gap: 'xsmall',
                    justifyContent: 'center',
                  }}
                  css={{ display: 'flex', flexGrow: 1 }}
                >
                  All add-ons
                </Tab>
                <Tab
                  key={AddonType.Cloud}
                  innerProps={{
                    flexGrow: 1,
                    gap: 'xsmall',
                    justifyContent: 'center',
                  }}
                  css={{ display: 'flex', flexGrow: 1 }}
                >
                  {ClusterDistroShortNames[cluster?.distro ?? '']} add-ons
                </Tab>
              </TabList>
            )}
          </div>
          {addonType === AddonType.All && (
            <div>
              {!isEmpty(runtimeServices) ? (
                <RuntimeServices
                  flush
                  data={data}
                />
              ) : (
                <EmptyState description="No known add-ons found" />
              )}
            </div>
          )}
          {addonType === AddonType.Cloud && (
            <div>
              {!isEmpty(cloudAddons) ? (
                <CloudAddons
                  flush
                  data={data}
                />
              ) : (
                <EmptyState description="No known cloud add-ons found" />
              )}
            </div>
          )}
        </AccordionItem>
      </Accordion>
      <div css={{ ...theme.partials.text.body1Bold }}>
        Warnings ({cluster?.deprecatedCustomResources?.length ?? 0})
      </div>
      <Accordion
        defaultValue={initialOpen}
        type="single"
        fillLevel={1}
        ref={(domNode) =>
          scrollOnMount(domNode, UpgradeAccordionName.CustomResources)
        }
      >
        <AccordionItem
          value={UpgradeAccordionName.CustomResources}
          paddingArea="trigger-only"
          trigger={
            <ClusterUpgradeAccordionTrigger
              checked={cluster?.deprecatedCustomResources?.length === 0}
              icon={ChecklistIcon}
              title="Deprecated custom resources"
              subtitle="Ensure all custom resources are updated to the version required for upgrade"
            />
          }
        >
          {!isEmpty(cluster?.deprecatedCustomResources) ? (
            <Table
              flush
              virtualizeRows
              data={cluster?.deprecatedCustomResources ?? []}
              columns={clusterDeprecatedCustomResourcesColumns}
              maxHeight={500}
            />
          ) : (
            <EmptyState description="You do not have any deprecated custom resources." />
          )}
        </AccordionItem>
      </Accordion>
    </div>
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
  icon: ComponentType<IconProps>
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

export const getPreFlightChecklist = (
  upgradePlan: Nullable<ClusterUpgradePlanFragment>
) =>
  initialClusterPreFlightItems.map((item) =>
    produce(item, (d) => {
      d.value = !!upgradePlan?.[d.key]
    })
  )
