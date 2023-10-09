import { Button, ErrorIcon } from '@pluralsh/design-system'

export default function ClusterMetadata() {
  return (
    <Button
      secondary
      endIcon={<ErrorIcon color="icon-danger" />}
    >
      Metadata
    </Button>
  )
}
