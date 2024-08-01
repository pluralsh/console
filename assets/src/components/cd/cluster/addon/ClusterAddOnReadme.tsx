import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'
import { useRuntimeServiceQuery } from 'generated/graphql'

import MarkdocComponent from '../../../utils/MarkdocContent'

import { ScrollablePage } from '../../../utils/layout/ScrollablePage'

import { useClusterAddOnContext } from '../ClusterAddOns'

import { versionPlaceholder } from './ClusterAddOnReleases'

export default function ClusterAddOnReadme() {
  const { runtimeService: rts } = useClusterAddOnContext()
  const { data, loading, error } = useRuntimeServiceQuery({
    variables: { id: rts?.id, version: versionPlaceholder },
  })

  if (loading) return <LoadingIndicator />

  if (error)
    return (
      <GqlError
        header="Could not fetch readme"
        error={error}
      />
    )

  return (
    <ScrollablePage>
      <MarkdocComponent
        raw={
          data?.runtimeService?.addon?.readme ||
          'No readme available for this component'
        }
      />
    </ScrollablePage>
  )
}
