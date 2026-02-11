import { ApolloError } from '@apollo/client'
import {
  Chip,
  ChipProps,
  ConfettiIcon,
  EmptyState,
  Flex,
  Tab,
  Table,
  TabList,
  useSetBreadcrumbs,
  WarningIcon,
} from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import {
  ClusterDistro,
  ClusterOverviewDetailsFragment,
  ClusterUpgradePlanFragment,
  UpgradeInsight,
  UpgradeInsightStatus,
  useClusterBasicQuery,
  useClusterOverviewDetailsQuery,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useMemo, useRef, useState } from 'react'
import { useTheme } from 'styled-components'

import { GqlError } from '../../../utils/Alert.tsx'

import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment.tsx'
import ClusterSelector from 'components/cd/utils/ClusterSelector.tsx'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders.tsx'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { StackedText } from 'components/utils/table/StackedText.tsx'
import { Body1BoldP } from 'components/utils/typography/Text.tsx'
import { produce } from 'immer'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  CLUSTER_UPGRADES_REL_PATH,
  getClusterDetailsPath,
} from 'routes/cdRoutesConsts.tsx'
import semver from 'semver'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { ClusterDistroShortNames } from '../../../utils/ClusterDistro.tsx'
import { getClusterUpgradeInfo } from '../../clusters/ClusterUpgradeButton.tsx'
import {
  clusterPreFlightCols,
  clusterUpgradeColumns,
  initialClusterPreFlightItems,
} from '../../clusters/clusterUpgradeColumns.tsx'
import { deprecationsColumns } from '../../clusters/deprecationsColumns.tsx'
import CloudAddons from '../../clusters/runtime/CloudAddons.tsx'
import {
  getClusterKubeVersion,
  RuntimeServices,
} from '../../clusters/runtime/RuntimeServices.tsx'
import {
  UpgradeInsightExpansionPanel,
  upgradeInsightsColumns,
} from '../../clusters/UpgradeInsights.tsx'
import { getClusterBreadcrumbs } from '../Cluster.tsx'
import { ClusterUpgradePlanAccordion } from './ClusterUpgradePlanAccordion.tsx'
import { ClusterUpgradePlanCRAccordion } from './ClusterUpgradePlanCRTable.tsx'
import { UpgradesConsolidatedTable } from './UpgradesConsolidatedTable.tsx'

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

const hasBlockingAddons = (cluster: Nullable<ClusterOverviewDetailsFragment>) =>
  !isEmpty(cluster?.upgradePlanSummary?.blockingAddons) ||
  !isEmpty(cluster?.upgradePlanSummary?.blockingCloudAddons)

export function ClusterUpgradePlan() {
  const navigate = useNavigate()
  const theme = useTheme()
  const tabStateRef = useRef<any>(null)
  const { clusterId } = useParams()
  const [searchParams] = useSearchParams()
  const initialView = searchParams.get('view') ?? 'none'

  const {
    data: basicData,
    loading: basicLoading,
    error: basicError,
  } = useClusterBasicQuery({
    variables: { id: clusterId ?? '' },
    skip: !clusterId,
    fetchPolicy: 'cache-and-network',
  })
  const clusterBasic = basicData?.cluster
  const kubeVersion = getClusterKubeVersion(clusterBasic)
  const parsedKubeVersion =
    semver.coerce(kubeVersion) ?? semver.coerce('1.21.0')
  const nextKubeVersion = `${parsedKubeVersion.major}.${parsedKubeVersion.minor + 1}`

  const { data, loading, error, refetch } = useClusterOverviewDetailsQuery({
    variables: {
      id: clusterBasic?.id ?? '',
      kubeVersion,
      nextKubeVersion,
      hasKubeVersion: true,
    },
    skip: !clusterBasic?.id,
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const isLoading = !data && (loading || basicLoading)
  const cluster = data?.cluster
  const kubernetesChangelog = data?.kubernetesChangelog

  const [addonType, setAddonType] = useState(AddonType.All)
  const [deprecationType, setDeprecationType] = useState(DeprecationType.GitOps)
  const [upgradeError, setError] = useState<Nullable<ApolloError>>(undefined)

  const { numUpgradeBlockers } = getClusterUpgradeInfo(cluster)

  const runtimeServices = cluster?.runtimeServices
  const cloudAddons = cluster?.cloudAddons
  const apiDeprecations = cluster?.apiDeprecations
  const upgradeInsights = cluster?.upgradeInsights
  const deprecatedCRs =
    cluster?.deprecatedCustomResources?.filter(isNonNullable) ?? []

  const upgradeIssues = upgradeInsights?.filter(
    (i) => i?.status && statesWithIssues.includes(i.status)
  )

  const supportsCloudAddons = cluster?.distro === ClusterDistro.Eks

  const preFlightChecklist = useMemo(
    () => getPreFlightChecklist(cluster?.upgradePlan),
    [cluster?.upgradePlan]
  )

  useSetBreadcrumbs(
    useMemo(
      () => getClusterBreadcrumbs({ cluster, tab: CLUSTER_UPGRADES_REL_PATH }),
      [cluster]
    )
  )

  return (
    <Flex
      direction="column"
      gap="large"
      padding="large"
      height="100%"
      minHeight={0}
      overflow="hidden"
    >
      <StretchedFlex>
        <StackedText
          loading={isLoading}
          first="Recommended upgrades"
          firstPartialType="subtitle1"
          firstColor="text"
          second="Add-ons currently blocking cluster upgrade will be listed here"
          secondPartialType="body2"
          secondColor="text-xlight"
        />
        <div css={{ flex: 1 }} />
        <ClusterSelector
          fillLevel={0}
          allowDeselect={false}
          clusterId={clusterId}
          onClusterChange={(cluster) => {
            if (cluster?.id)
              navigate(
                `${getClusterDetailsPath({ clusterId: cluster.id })}/${CLUSTER_UPGRADES_REL_PATH}`
              )
          }}
          placeholder="Select a cluster"
          hideTitleContent
        />
      </StretchedFlex>
      {!cluster ? (
        error ? (
          <GqlError error={basicError || error} />
        ) : isLoading ? (
          <RectangleSkeleton
            $height={300}
            $width="100%"
          />
        ) : (
          <EmptyState message="Cluster not found" />
        )
      ) : (
        <Flex
          direction="column"
          gap="large"
          overflow="auto"
          minHeight={0}
        >
          <Table
            hideHeader
            data={[cluster]}
            columns={clusterUpgradeColumns}
            reactTableOptions={{ meta: { refetch, setError } }}
            padding={theme.spacing.medium}
            overflow="visible"
          />
          {hasBlockingAddons(cluster) && (
            <UpgradesConsolidatedTable
              cluster={cluster}
              kubernetesChangelog={kubernetesChangelog}
            />
          )}
          {upgradeError && (
            <GqlError
              header="Could not upgrade cluster"
              error={upgradeError}
            />
          )}
          <div css={{ ...theme.partials.text.body1Bold }}>
            Upgrade blockers ({numUpgradeBlockers})
          </div>
          <ClusterUpgradePlanAccordion
            defaultValue={initialView}
            name={UpgradeAccordionName.Preflight}
            checked={preFlightChecklist.every((i) => i.value)}
            title="Pre-flight checklist"
            subtitle="Ensure your K8s infrastructure is upgrade-ready"
          >
            <Table
              flush
              fillLevel={1}
              borderTop={theme.borders['fill-two']}
              rowBg="base"
              data={preFlightChecklist}
              columns={clusterPreFlightCols}
            />
          </ClusterUpgradePlanAccordion>
          <ClusterUpgradePlanAccordion
            defaultValue={initialView}
            name={UpgradeAccordionName.Deprecations}
            checked={!!cluster?.upgradePlan?.deprecations}
            title="Check API deprecations"
            subtitle="Ensure that all K8s YAML you're deploying is conformant with the next K8s version"
          >
            <Flex grow={1}>
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
            </Flex>
            {deprecationType === DeprecationType.GitOps && (
              <div>
                {!isEmpty(apiDeprecations) ? (
                  <Table
                    flush
                    data={apiDeprecations || []}
                    columns={deprecationsColumns}
                    maxHeight={220}
                    height="100%"
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
                    maxHeight={400}
                    height="100%"
                  />
                ) : (
                  <ConfettiEmptyState description="No services with cloud provider insights discovered!" />
                )}
              </div>
            )}
          </ClusterUpgradePlanAccordion>
          <ClusterUpgradePlanAccordion
            defaultValue={initialView}
            name={UpgradeAccordionName.AddOns}
            checked={!!cluster?.upgradePlan?.compatibilities}
            title="Check add-on compatibilities"
            subtitle="Ensure all known third-party add-ons are supported on the next K8s version"
          >
            <Flex grow={1}>
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
            </Flex>
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
          </ClusterUpgradePlanAccordion>
          <Body1BoldP>Warnings ({deprecatedCRs.length})</Body1BoldP>
          <ClusterUpgradePlanCRAccordion
            deprecatedCRs={deprecatedCRs}
            defaultValue={initialView}
          />
        </Flex>
      )}
    </Flex>
  )
}

export function ConfettiEmptyState({ description }) {
  const { colors } = useTheme()

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="small"
      padding="medium"
    >
      <ConfettiIcon
        size={32}
        color={colors['icon-success']}
      />
      <span>{description}</span>
    </Flex>
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
