import { useState } from 'react'
import { IconFrame, PushPinIcon } from '@pluralsh/design-system'

import { useIsPinnedResource } from '../Cluster'

import { Types_CustomResourceDefinition as CustomResourceDefinitionT } from '../../../generated/graphql-kubernetes'

import PinCustomResourceDefinitionModal from './PinCustomResourceDefinitionModal'

export default function PinCustomResourceDefinition({
  crd,
}: {
  crd: CustomResourceDefinitionT
}) {
  const [open, setOpen] = useState(false)
  const isPinned = useIsPinnedResource(crd.names.kind, crd.version, crd.group)

  if (isPinned) return null

  return (
    crd?.objectMeta?.name &&
    crd?.group &&
    crd?.version &&
    crd?.names?.kind &&
    crd?.scope && (
      <div onClick={(e) => e.stopPropagation()}>
        <IconFrame
          icon={<PushPinIcon />}
          textValue="Pin Custom Resource Definition"
          tooltip
          size="medium"
          clickable
          onClick={() => setOpen(true)}
        />
        {open && (
          <PinCustomResourceDefinitionModal
            name={crd.objectMeta.name}
            group={crd.group}
            version={crd.version}
            kind={crd.names.kind}
            namespaced={crd.scope?.toLowerCase() === 'namespaced'}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    )
  )
}
