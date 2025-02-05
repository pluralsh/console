import { LabelsAnnotations } from 'components/cluster/LabelsAnnotations'
import { MetadataGrid, MetadataItem } from 'components/utils/Metadata'
import { useOutletContext } from 'react-router-dom'

import { ComponentDetailsContext } from './ComponentDetails'
import { InfoSection } from './info/common'

export default function MetadataOutlet() {
  const { component, componentDetails } =
    useOutletContext<ComponentDetailsContext>()

  return (
    <MetadataBase
      component={component}
      metadata={componentDetails?.metadata}
    />
  )
}

export function MetadataBase({
  component,
  metadata,
}: {
  component: Nullable<Record<string, any>>
  metadata: Nullable<Record<string, any>>
}) {
  return (
    <InfoSection
      css={{ flexGrow: 1 }}
      title="Metadata"
    >
      <MetadataGrid>
        {(metadata?.name || component?.name) && (
          <MetadataItem heading="Name">
            {metadata?.name || component?.name}
          </MetadataItem>
        )}
        {(metadata?.namespace || component?.namespace) && (
          <MetadataItem heading="Namespace">
            {metadata?.namespace || component?.namespace}
          </MetadataItem>
        )}
        {component?.kind && (
          <MetadataItem heading="Kind">
            <>
              {component?.group || 'v1'}/{component?.kind}
            </>
          </MetadataItem>
        )}
      </MetadataGrid>
      {metadata && <LabelsAnnotations metadata={metadata as any} />}
    </InfoSection>
  )
}
