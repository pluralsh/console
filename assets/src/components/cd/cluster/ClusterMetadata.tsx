import { Button, ErrorIcon } from '@pluralsh/design-system'
import { useState } from 'react'

import ClusterMetadataPanel from './ClusterMetadataPanel'

// TODO: Replace any.
export default function ClusterMetadata({ cluster }: { cluster?: any }) {
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
