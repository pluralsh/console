import { ReactNode } from 'react'
import {
  CheckIcon,
  CloseIcon,
  Sidecar,
  SidecarItem,
} from '@pluralsh/design-system'

import { StackRun } from '../../../generated/graphql'
import { ResponsiveLayoutSidecarContainer } from '../../utils/layout/ResponsiveLayoutSidecarContainer'
import UserInfo from '../../utils/UserInfo'

interface StackRunSidecarProps {
  stackRun: StackRun
}

export default function StackRunSidecar({
  stackRun,
}: StackRunSidecarProps): ReactNode {
  return (
    <ResponsiveLayoutSidecarContainer>
      <Sidecar>
        <SidecarItem heading="ID">{stackRun.id}</SidecarItem>
        <SidecarItem heading="Needs approval">
          {stackRun.approval ? (
            <CheckIcon size="16px" />
          ) : (
            <CloseIcon size="16px" />
          )}
        </SidecarItem>
        {stackRun.approvedAt && (
          <SidecarItem heading="Approved at">{stackRun.approvedAt}</SidecarItem>
        )}
        {stackRun.approver && (
          <SidecarItem heading="Approver">
            <UserInfo user={stackRun.approver} />
          </SidecarItem>
        )}
        <SidecarItem heading="Commit message">{stackRun.message}</SidecarItem>
      </Sidecar>
    </ResponsiveLayoutSidecarContainer>
  )
}
