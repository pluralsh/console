import { GetNamespacesResponse } from '../../../generated/kubernetes'
import { Error as K8sError } from './types'

function getForbiddenNamespaceListError(
  errors: GetNamespacesResponse['errors'] | undefined
): string | undefined {
  const forbidden = (errors ?? []).find((error) => {
    const k8sError = error as K8sError

    return (
      k8sError?.ErrStatus?.code === 403 ||
      k8sError?.ErrStatus?.reason === 'Forbidden'
    )
  }) as K8sError | undefined

  return forbidden?.ErrStatus?.message
}

export function getNamespaceListLoadError(
  data: GetNamespacesResponse | undefined,
  isError: boolean,
  queryError: Error | null | undefined
): string | undefined {
  if (isError) {
    return queryError?.message || 'Failed to load namespaces'
  }

  return getForbiddenNamespaceListError(data?.errors)
}
