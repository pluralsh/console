import { ReactElement } from 'react'
import moment from 'moment'
import { ChipList } from '@pluralsh/design-system'

import { Controller_ResourceOwner as ResourceOwnerT } from '../../../generated/graphql-kubernetes'

import ResourceInfoCard, {
  ResourceInfoCardEntry,
  ResourceInfoCardSection,
} from './ResourceInfoCard'
import Annotations from './Annotations'
import ResourceLink from './ResourceLink'
import { toKind } from './types'

interface ResourceOwnerProps {
  owner: Nullable<ResourceOwnerT>
}

export default function ResourceOwner({
  owner,
}: ResourceOwnerProps): ReactElement<any> {
  return (
    <ResourceInfoCard title={`Controlled By ${owner?.typeMeta?.kind}`}>
      <ResourceInfoCardSection>
        <ResourceInfoCardEntry heading="Name">
          <ResourceLink
            short
            objectRef={{
              kind: toKind(owner?.typeMeta?.kind),
              namespace: owner?.objectMeta?.namespace,
              name: owner?.objectMeta?.name,
            }}
          />
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Pods">
          {owner?.pods?.running} / {owner?.pods?.desired}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Creation date">
          {moment(owner?.objectMeta?.creationTimestamp).format('lll')}
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Labels">
          <ChipList
            size="small"
            limit={3}
            values={Object.entries(owner?.objectMeta?.labels || {})}
            transformValue={(label) => label.join(': ')}
            emptyState={<div>-</div>}
          />
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Annotations">
          <Annotations annotations={owner?.objectMeta?.annotations} />
        </ResourceInfoCardEntry>
        <ResourceInfoCardEntry heading="Images">
          <ChipList
            size="small"
            limit={3}
            values={(owner?.containerImages ?? []).concat(
              owner?.initContainerImages ?? []
            )}
            emptyState={<div>-</div>}
          />
        </ResourceInfoCardEntry>
      </ResourceInfoCardSection>
    </ResourceInfoCard>
  )
}
