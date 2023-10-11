import { Button, ErrorIcon } from '@pluralsh/design-system'
import { useState } from 'react'

import { ClustersRowFragment } from '../../../generated/graphql'

import ClusterMetadataPanel from './ClusterMetadataPanel'

export default function ClusterMetadata({
  cluster,
}: {
  cluster?: ClustersRowFragment | null
}) {
  const [metadataOpen, setMetadataOpen] = useState(false)

  return (
    <>
      <Button
        secondary
        endIcon={<ErrorIcon color="icon-danger" />}
        onClick={() => setMetadataOpen(true)}
      >
        Metadata
      </Button>
      <ClusterMetadataPanel
        cluster={cluster}
        open={metadataOpen}
        setOpen={setMetadataOpen}
      />
    </>
  )
}
