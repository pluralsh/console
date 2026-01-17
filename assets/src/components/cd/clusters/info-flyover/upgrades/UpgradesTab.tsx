import { ApolloError } from '@apollo/client'
import {
  Accordion,
  AccordionItem,
  Chip,
  ChipProps,
  ConfettiIcon,
  Flex,
  Input,
  SearchIcon,
  SuccessIcon,
  Tab,
  Table,
  TabList,
  WarningIcon,
} from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import Fuse from 'fuse.js'
import {
  ClusterDistro,
  ClusterOverviewDetailsFragment,
  ClusterUpgradeDeprecatedCustomResourceFragment,
  ClusterUpgradePlanFragment,
  UpgradeInsight,
  UpgradeInsightStatus,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useMemo, useRef, useState } from 'react'
import { useTheme } from 'styled-components'

import { GqlError } from '../../../../utils/Alert.tsx'

import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { StackedText } from 'components/utils/table/StackedText.tsx'
import { produce } from 'immer'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { runAfterBrowserLayout } from 'utils/runAfterBrowserLayout.ts'
import { ClusterDistroShortNames } from '../../../../utils/ClusterDistro.tsx'
import { clusterDeprecatedCustomResourcesColumns } from '../../clusterDeprecatedCustomResourcesColumns.tsx'
import { getClusterUpgradeInfo } from '../../ClusterUpgradeButton.tsx'
import {
  clusterPreFlightCols,
  clusterUpgradeColumns,
  initialClusterPreFlightItems,
} from '../../clusterUpgradeColumns.tsx'
import { deprecationsColumns } from '../../deprecationsColumns.tsx'
import CloudAddons from '../../runtime/CloudAddons.tsx'
import { RuntimeServices } from '../../runtime/RuntimeServices.tsx'
import {
  UpgradeInsightExpansionPanel,
  upgradeInsightsColumns,
} from '../../UpgradeInsights.tsx'
import { UpgradesConsolidatedTable } from './UpgradesConsolidatedTable.tsx'
import { useThrottle } from 'components/hooks/useThrottle.tsx'

enum DeprecationType {
  GitOps = 'gitOps',
  CloudProvider = 'cloudProvider',
}

enum AddonType {
  All = 'all',
  Cloud = 'cloud',
}

const deprecatedCRSearchOptions: Fuse.IFuseOptions<ClusterUpgradeDeprecatedCustomResourceFragment> =
  {
    keys: ['name', 'namespace', 'group'],
    threshold: 0.25,
    ignoreLocation: true,
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

const hasBlockingAddons = (cluster: ClusterOverviewDetailsFragment) =>
  !isEmpty(cluster?.upgradePlanSummary?.blockingAddons) ||
  !isEmpty(cluster?.upgradePlanSummary?.blockingCloudAddons)

export function UpgradesTab({
  cluster,
  refetch,
  initialOpen,
}: {
  cluster: ClusterOverviewDetailsFragment
  refetch: Nullable<() => void>
  initialOpen?: UpgradeAccordionName | undefined
}) {
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const [scrolledIntoView, setScrolledIntoView] = useState(false)

  const [addonType, setAddonType] = useState(AddonType.All)
  const [deprecationType, setDeprecationType] = useState(DeprecationType.GitOps)
  const [upgradeError, setError] = useState<Nullable<ApolloError>>(undefined)
  const [deprecatedCRSearch, setDeprecatedCRSearch] = useState('')
  const throttledCRSearch = useThrottle(deprecatedCRSearch, 250)

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

  const filteredDeprecatedCRs = useMemo(() => {
    const resources =
      cluster?.deprecatedCustomResources?.filter(isNonNullable) ?? []
    return !throttledCRSearch
      ? resources
      : new Fuse(resources, deprecatedCRSearchOptions)
          .search(throttledCRSearch)
          .map(({ item }) => item)
  }, [cluster?.deprecatedCustomResources, throttledCRSearch])

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

  return (
    <Flex
      direction="column"
      gap="large"
    >
      {hasBlockingAddons(cluster) && (
        <StackedText
          first="Recommended upgrades"
          firstPartialType="subtitle1"
          firstColor="text"
          second="These add-ons are currently blocking your cluster upgrade"
          secondPartialType="body2"
          secondColor="text-xlight"
        />
      )}
      {hasBlockingAddons(cluster) && (
        <UpgradesConsolidatedTable cluster={cluster} />
      )}
      {upgradeError && (
        <GqlError
          header="Could not upgrade cluster"
          error={upgradeError}
        />
      )}
      <Table
        hideHeader
        data={[cluster]}
        columns={clusterUpgradeColumns}
        reactTableOptions={{ meta: { refetch, setError } }}
        padding={theme.spacing.medium}
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
          paddedCaret
          caret="left"
          paddingArea="trigger-only"
          trigger={
            <ClusterUpgradeAccordionTrigger
              checked={preFlightChecklist.every((i) => i.value)}
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
          paddedCaret
          caret="left"
          paddingArea="trigger-only"
          trigger={
            <ClusterUpgradeAccordionTrigger
              checked={!!cluster?.upgradePlan?.deprecations}
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
                <ConfettiEmptyState description="No services with API deprecations discovered!" />
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
                <ConfettiEmptyState description="No services with cloud provider insights discovered!" />
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
          paddedCaret
          caret="left"
          paddingArea="trigger-only"
          trigger={
            <ClusterUpgradeAccordionTrigger
              checked={!!cluster?.upgradePlan?.compatibilities}
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
                  cluster={cluster}
                />
              ) : (
                <ConfettiEmptyState description="No known add-ons found" />
              )}
            </div>
          )}
          {addonType === AddonType.Cloud && (
            <div>
              {!isEmpty(cloudAddons) ? (
                <CloudAddons
                  flush
                  cluster={cluster}
                />
              ) : (
                <ConfettiEmptyState description="No known cloud add-ons found" />
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
          paddedCaret
          caret="left"
          paddingArea="trigger-only"
          trigger={
            <ClusterUpgradeAccordionTrigger
              checked={isEmpty(cluster?.deprecatedCustomResources)}
              title="Deprecated custom resources"
              subtitle="Ensure all custom resources are updated to the version required for upgrade"
            />
          }
        >
          <div css={{ padding: theme.spacing.xsmall }}>
            <Input
              css={{ background: 'transparent' }}
              placeholder="Search custom resources"
              startIcon={<SearchIcon />}
              value={deprecatedCRSearch}
              onChange={(e) => setDeprecatedCRSearch(e.target.value)}
            />
          </div>
          {!isEmpty(cluster?.deprecatedCustomResources) ? (
            <Table
              flush
              virtualizeRows
              data={filteredDeprecatedCRs}
              columns={clusterDeprecatedCustomResourcesColumns}
              maxHeight={500}
              emptyStateProps={{
                message: 'No custom resources match your search.',
              }}
            />
          ) : (
            <ConfettiEmptyState description="You do not have any deprecated custom resources." />
          )}
        </AccordionItem>
      </Accordion>
      {/* helpful spacer because bottom padding may get covered, can remove if the layout changes */}
      <div css={{ minHeight: 1 }} />
    </Flex>
  )
}

function ConfettiEmptyState({ description }) {
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
  title,
  subtitle,
  checked,
}: {
  title: string
  subtitle?: string
  checked: boolean
}) {
  return (
    <StretchedFlex>
      <StackedText
        first={title}
        firstPartialType="body1Bold"
        firstColor="text"
        second={subtitle}
        secondPartialType="body2"
        secondColor="text-light"
      />
      {checked ? (
        <SuccessIcon
          size="18"
          color="icon-success"
        />
      ) : (
        <WarningIcon
          size="18"
          color="icon-warning"
        />
      )}
    </StretchedFlex>
  )
}

export const getPreFlightChecklist = (
  upgradePlan: Nullable<ClusterUpgradePlanFragment>
) =>
  initialClusterPreFlightItems.map((item) =>
    produce(item, (d) => {
      d.value = !!upgradePlan?.[d.key]
    })
  )
