import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useServiceTarballQuery } from 'generated/graphql'
import { useParams } from 'react-router-dom'

export function ComponentsFilesView() {
  const { serviceId } = useParams<{ serviceId: string }>()

  const { data, loading, error } = useServiceTarballQuery({
    variables: { id: serviceId! },
    skip: !serviceId,
  })

  if (error) return <GqlError error={error} />

  if (loading) return <LoadingIndicator />

  return <div>{JSON.stringify(data)}</div>
}
