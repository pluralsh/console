import { Card, Prop } from '@pluralsh/design-system'

import capitalize from 'lodash/capitalize'
import { Link, useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { fromNow } from 'utils/datetime'

import { getClusterDetailsPath } from '../../../routes/cdRoutesConsts'
import { ClusterProviderIcon } from '../../utils/Provider'
import { InlineLink } from '../../utils/typography/InlineLink'

import { OverlineH1 } from '../../utils/typography/Text'
import { StackOutletContextT } from '../Stacks'
import StackApprovalChip from '../common/StackApprovalChip'
import StackStatusChip from '../common/StackStatusChip'

export default function StackMetadata() {
  const theme = useTheme()
  const { stack } = useOutletContext() as StackOutletContextT

  return (
    <Card css={{ padding: theme.spacing.large }}>
      <OverlineH1
        as="h3"
        css={{
          color: theme.colors['text-xlight'],
          marginBottom: theme.spacing.large,
        }}
      >
        Metadata
      </OverlineH1>
      <div
        css={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gridGap: theme.spacing.large,
        }}
      >
        <Prop
          title="Status"
          margin={0}
        >
          <StackStatusChip
            status={stack.status}
            deleting={!!stack.deletedAt}
          />
        </Prop>
        <Prop
          title="Type"
          margin={0}
        >
          {capitalize(stack.type)}
        </Prop>
        <Prop
          title="Paused"
          margin={0}
        >
          {stack.paused ? 'Paused' : 'Active'}
        </Prop>
        <Prop
          title="Ref"
          margin={0}
        >
          {stack.git.ref}
        </Prop>
        <Prop
          title="Folder"
          margin={0}
        >
          {stack.git.folder}
        </Prop>
        {stack.configuration.image && (
          <Prop
            title="Image"
            margin={0}
          >
            {stack.configuration.image}
          </Prop>
        )}
        <Prop
          title="Version"
          margin={0}
        >
          {stack.configuration.version}
        </Prop>
        <Prop
          title="Approval"
          margin={0}
        >
          <StackApprovalChip approval={!!stack.approval} />
        </Prop>
        <Prop
          title="Cluster"
          margin={0}
        >
          <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
            <ClusterProviderIcon
              cluster={stack.cluster}
              size={16}
            />
            <InlineLink
              as={Link}
              to={getClusterDetailsPath({ clusterId: stack?.cluster?.id })}
            >
              {stack.cluster?.name}
            </InlineLink>
          </div>
        </Prop>

        <Prop
          title="Created"
          margin={0}
        >
          {fromNow(stack.insertedAt)}
        </Prop>
        {stack.deletedAt && (
          <Prop
            title="Deleted"
            margin={0}
          >
            {fromNow(stack.deletedAt)}
          </Prop>
        )}
        <Prop
          title="ID"
          margin={0}
        >
          {stack.id}
        </Prop>
      </div>
    </Card>
  )
}
