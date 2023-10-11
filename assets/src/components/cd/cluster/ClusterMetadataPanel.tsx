import { Dispatch, ReactElement } from 'react'
import { InfoPanel, Prop, Tooltip } from '@pluralsh/design-system'
import moment from 'moment'

import { Cluster } from '../../../generated/graphql'

export default function ClusterMetadataPanel({
  cluster,
  open,
  setOpen,
}: {
  cluster: Cluster
  open: boolean
  setOpen: Dispatch<boolean>
}): ReactElement | null {
  if (!open) return null

  return (
    <InfoPanel
      title="Metadata"
      width={388}
      marginTop="155px"
      contentHeight={442}
      contentPadding={16}
      contentGap={16}
      onClose={() => setOpen(false)}
    >
      <Prop
        title="Cluster name"
        margin={0}
      >
        {cluster.name}
      </Prop>
      <Prop
        title="Last pinged"
        margin={0}
      >
        {cluster.pingedAt ? (
          <Tooltip
            label={moment(cluster.pingedAt).format('lll')}
            placement="top"
          >
            <span>{moment(cluster.pingedAt).fromNow()}</span>
          </Tooltip>
        ) : (
          '-'
        )}
      </Prop>
    </InfoPanel>
  )
}
