import { Sidecar, SidecarItem } from '@pluralsh/design-system'
import { Body2P } from 'components/utils/typography/Text'
import { GetManagedNamespaceQuery } from 'generated/graphql'
import moment from 'moment'

function NamespaceSidecar({
  namespace,
}: {
  namespace: GetManagedNamespaceQuery['managedNamespace']
}) {
  return (
    <Sidecar
      width={200}
      minWidth={200}
    >
      <SidecarItem heading="Last Updated">
        {moment(namespace?.updatedAt || namespace?.insertedAt).format(
          'M/D/YYYY'
        )}
      </SidecarItem>
      <SidecarItem heading="ID">{namespace?.id}</SidecarItem>
      {namespace?.description ? (
        <SidecarItem heading="Description">
          {namespace?.description}
        </SidecarItem>
      ) : null}
      {namespace?.labels ? (
        <SidecarItem heading="Labels">
          <Body2P>
            {Object.keys(namespace?.labels || {})
              ?.map((label) => `${label}: ${namespace?.labels?.[label]}`)
              .join(', ')}
          </Body2P>
        </SidecarItem>
      ) : null}
    </Sidecar>
  )
}

export default NamespaceSidecar
