import { useIngressesQuery } from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import { useKubernetesContext } from '../Kubernetes'

export default function Ingresses() {
  const { cluster, namespace } = useKubernetesContext()

  const { data } = useIngressesQuery({
    client: KubernetesClient(cluster?.id ?? ''),
    skip: !cluster,
    variables: { namespace },
  })

  return (
    <div>
      {data?.handleGetIngressList?.items.map((ingress) => (
        <div>
          {ingress?.objectMeta.name} {ingress?.objectMeta.namespace}
        </div>
      ))}
    </div>
  )
}
