import {
  AiSparkleFilledIcon,
  ArrowTopRightIcon,
  Button,
  Chip,
  Flex,
  IconFrame,
  PrOpenIcon,
  Sidecar,
  SidecarItem,
  Tooltip,
} from '@pluralsh/design-system'
import { ReactNode } from 'react'
import { useTheme } from 'styled-components'
import { formatLocalizedDateTime } from 'utils/datetime'

import { Link } from 'react-router-dom'

import { PrStatusChip } from 'components/self-service/pr/queue/PrQueueColumns'

import { aiGradientBorderStyles } from 'components/ai/explain/ExplainWithAIButton.tsx'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { TRUNCATE_LEFT } from 'components/utils/truncate.ts'
import { StackRunDetailsFragment } from 'generated/graphql'
import { getClusterDetailsPath } from '../../../routes/cdRoutesConsts'
import { ResponsiveLayoutSidecarContainer } from '../../utils/layout/ResponsiveLayoutSidecarContainer'
import { ClusterProviderIcon } from '../../utils/Provider'
import { StackedText } from '../../utils/table/StackedText'
import { InlineLink } from '../../utils/typography/InlineLink'
import {
  StackAIApprovalChip,
  StackApprovalChip,
} from '../common/StackApprovalChip'
import StackObservabilityMetrics from '../common/StackObservabilityMetrics'
import { StackStatusChip } from '../common/StackStatusChip'
import { ViolationSeverity } from './violations/columns.tsx'

interface StackRunSidecarProps {
  stackRun: StackRunDetailsFragment
}

export default function StackRunSidecar({
  stackRun,
}: StackRunSidecarProps): ReactNode {
  const theme = useTheme()
  const {
    pullRequest: pr,
    configuration: { aiApproval },
    approvalResult,
    repository,
  } = stackRun

  return (
    <ResponsiveLayoutSidecarContainer
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
      }}
    >
      {aiApproval?.enabled && approvalResult?.result && (
        <Sidecar css={aiGradientBorderStyles(theme)}>
          <SidecarItem
            heading={
              <StretchedFlex>
                <span>Approval decision</span>
                <AiSparkleFilledIcon
                  color="icon-info"
                  size={13}
                />
              </StretchedFlex>
            }
          >
            <StackAIApprovalChip approvalResult={approvalResult.result} />
          </SidecarItem>
          <SidecarItem heading="Approval reason">
            <span>{approvalResult.reason}</span>
          </SidecarItem>
          <SidecarItem heading="Rule file">
            <Tooltip
              placement="top"
              label={`${aiApproval.git.folder}/${aiApproval.file}`}
            >
              <div css={TRUNCATE_LEFT}>
                {aiApproval.git.folder}/{aiApproval.file}
              </div>
            </Tooltip>
          </SidecarItem>
          {repository?.httpsPath && (
            <SidecarItem heading="Repo">
              <Tooltip
                placement="top"
                label={`${repository.httpsPath}@${aiApproval.git.ref}`}
              >
                <div css={TRUNCATE_LEFT}>
                  {repository.httpsPath}@{aiApproval.git.ref}
                </div>
              </Tooltip>
            </SidecarItem>
          )}
          <SidecarItem heading="Overridable">
            <Chip size="small">{aiApproval.ignoreCancel ? 'Yes' : 'No'}</Chip>
          </SidecarItem>
        </Sidecar>
      )}
      {pr && (
        <Sidecar
          css={{ paddingTop: theme.spacing.xsmall }}
          heading={
            <div css={{ display: 'flex', alignItems: 'center' }}>
              <IconFrame
                icon={<PrOpenIcon />}
                textValue="Delete"
              />
              <span>PARENT PR</span>
            </div>
          }
        >
          <SidecarItem heading="PR title">
            <span>{pr?.title}</span>
          </SidecarItem>
          <SidecarItem heading="PR status">
            <PrStatusChip status={pr?.status} />
          </SidecarItem>
          <SidecarItem>
            <Button
              small
              floating
              endIcon={<ArrowTopRightIcon />}
              as={Link}
              to={pr?.url}
            >
              Go to PR
            </Button>
          </SidecarItem>
        </Sidecar>
      )}
      <Sidecar css={{ overflowX: 'auto', minHeight: 'fit-content' }}>
        <SidecarItem heading="Run status">
          <StackStatusChip
            status={stackRun.status}
            size="small"
          />
        </SidecarItem>
        <SidecarItem heading="Approval">
          <StackApprovalChip
            approval={!!stackRun.approval}
            size="small"
          />
        </SidecarItem>
        {stackRun.approvedAt && (
          <SidecarItem heading="Approved at">
            {formatLocalizedDateTime(stackRun.approvedAt)}
          </SidecarItem>
        )}
        {stackRun.approver && (
          <SidecarItem heading="Approver">
            <StackedText
              first={stackRun.approver.name}
              second={stackRun.approver.email}
            />
          </SidecarItem>
        )}
        <SidecarItem heading="Observability metrics">
          <StackObservabilityMetrics
            observableMetrics={stackRun.stack?.observableMetrics}
          />
        </SidecarItem>
        <SidecarItem heading="Cluster">
          <Flex gap="xsmall">
            <ClusterProviderIcon
              cluster={stackRun.cluster}
              size={16}
            />
            <InlineLink
              as={Link}
              to={getClusterDetailsPath({ clusterId: stackRun?.cluster?.id })}
            >
              {stackRun.cluster?.name}
            </InlineLink>
          </Flex>
        </SidecarItem>
        {stackRun.policyEngine?.type && (
          <SidecarItem heading="Security scanner">
            {stackRun.policyEngine?.type}
          </SidecarItem>
        )}
        {stackRun.policyEngine?.maxSeverity && (
          <SidecarItem heading="Max violation severity">
            <ViolationSeverity severity={stackRun.policyEngine?.maxSeverity} />
          </SidecarItem>
        )}
        <SidecarItem heading="Created at">
          {formatLocalizedDateTime(stackRun.insertedAt)}
        </SidecarItem>
        <SidecarItem heading="Updated at">
          {formatLocalizedDateTime(stackRun.updatedAt)}
        </SidecarItem>
      </Sidecar>
    </ResponsiveLayoutSidecarContainer>
  )
}
