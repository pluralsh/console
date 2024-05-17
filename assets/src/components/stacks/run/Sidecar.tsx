import React, { ReactNode } from 'react'
import { Sidecar, SidecarItem } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import moment from 'moment'

import { StackRun } from '../../../generated/graphql'
import { ResponsiveLayoutSidecarContainer } from '../../utils/layout/ResponsiveLayoutSidecarContainer'
import UserInfo from '../../utils/UserInfo'
import { ClusterProviderIcon } from '../../utils/Provider'

interface StackRunSidecarProps {
  stackRun: StackRun
}

export default function StackRunSidecar({
  stackRun,
}: StackRunSidecarProps): ReactNode {
  const theme = useTheme()

  return (
    <ResponsiveLayoutSidecarContainer>
      <Sidecar>
        <SidecarItem heading="ID">{stackRun.id}</SidecarItem>
        <SidecarItem heading="Needs approval">
          {stackRun.approval ? 'Required' : 'Not required'}
        </SidecarItem>
        {stackRun.approvedAt && (
          <SidecarItem heading="Approved at">
            {moment(stackRun.approvedAt).format('lll')}
          </SidecarItem>
        )}
        {stackRun.approver && (
          <SidecarItem heading="Approver">
            <UserInfo user={stackRun.approver} />
          </SidecarItem>
        )}
        {stackRun.message && (
          <SidecarItem heading="Commit message">{stackRun.message}</SidecarItem>
        )}
        <SidecarItem heading="Cluster">
          <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
            <ClusterProviderIcon
              cluster={stackRun?.cluster}
              size={16}
            />
            {stackRun?.cluster?.name}
          </div>
        </SidecarItem>
        <SidecarItem heading="Repository">
          {stackRun.repository?.url}
        </SidecarItem>
        <SidecarItem heading="Created at">
          {moment(stackRun.insertedAt).format('lll')}
        </SidecarItem>
        <SidecarItem heading="Updated at">
          {moment(stackRun.updatedAt).format('lll')}
        </SidecarItem>
      </Sidecar>
    </ResponsiveLayoutSidecarContainer>
  )
}
