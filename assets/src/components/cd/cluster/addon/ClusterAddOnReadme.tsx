import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'
import { useRuntimeServiceQuery } from 'generated/graphql'

import { useOutletContext } from 'react-router-dom'

import MarkdocComponent from '../../../utils/MarkdocContent'

import { ScrollablePage } from '../../../utils/layout/ScrollablePage'

import { ClusterAddOnOutletContextT } from '../ClusterAddOns'

import { versionPlaceholder } from './ClusterAddOnReleases'

export default function ClusterAddOnReadme() {
  const { addOn } = useOutletContext<ClusterAddOnOutletContextT>()
  const { data, loading, error } = useRuntimeServiceQuery({
    variables: { id: addOn?.id ?? '', version: versionPlaceholder },
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
        raw={data?.runtimeService?.addon?.readme || 'No readme found'}
      />
    </ScrollablePage>
  )
}
