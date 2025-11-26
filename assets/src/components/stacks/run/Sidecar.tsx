import { ReactNode } from 'react'
import {
  ArrowTopRightIcon,
  Button,
  IconFrame,
  PrOpenIcon,
  Sidecar,
  SidecarItem,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { formatLocalizedDateTime } from 'utils/datetime'

import { Link } from 'react-router-dom'

import { PrStatusChip } from 'components/self-service/pr/queue/PrQueueColumns'

import { StackRunDetailsFragment } from '../../../generated/graphql'
import { ResponsiveLayoutSidecarContainer } from '../../utils/layout/ResponsiveLayoutSidecarContainer'
import StackApprovalChip from '../common/StackApprovalChip'
import { ClusterProviderIcon } from '../../utils/Provider'
import { InlineLink } from '../../utils/typography/InlineLink'
import { getClusterDetailsPath } from '../../../routes/cdRoutesConsts'
import { StackedText } from '../../utils/table/StackedText'
import { StackStatusChip } from '../common/StackStatusChip'
import StackObservabilityMetrics from '../common/StackObservabilityMetrics'
import { ViolationSeverity } from './violations/columns.tsx'

interface StackRunSidecarProps {
  stackRun: StackRunDetailsFragment
}

export default function StackRunSidecar({
  stackRun,
}: StackRunSidecarProps): ReactNode {
  const theme = useTheme()
  const pr = stackRun.pullRequest

  return (
    <ResponsiveLayoutSidecarContainer>
      {pr && (
        <Sidecar
          css={{
            paddingTop: theme.spacing.xsmall,
            marginBottom: theme.spacing.medium,
          }}
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
            <span>{pr.title}</span>
          </SidecarItem>
          <SidecarItem heading="PR status">
            <PrStatusChip status={pr.status} />
          </SidecarItem>
          <SidecarItem>
            <Button
              floating
              endIcon={<ArrowTopRightIcon />}
              as={Link}
              to={pr.url}
            >
              Go to PR
            </Button>
          </SidecarItem>
        </Sidecar>
      )}
      <Sidecar css={{ overflowX: 'auto' }}>
        <SidecarItem heading="Status">
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
          <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
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
          </div>
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
