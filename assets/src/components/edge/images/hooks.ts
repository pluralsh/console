import { ApolloError } from '@apollo/client'
import { useEffect, useState } from 'react'
import {
  NamespacedResourceDocument,
  Types_CustomResourceObject,
} from '../../../generated/graphql-kubernetes.ts'
import {
  Cluster,
  Metadata,
  useClusterQuery,
} from '../../../generated/graphql.ts'
import { KubernetesClient } from '../../../helpers/kubernetes.client.ts'

const useGetManagementCluster = () => {
  const { data, error, loading } = useClusterQuery({
    variables: { handle: 'mgmt' },
  })

  return { cluster: data?.cluster as Cluster, error: error, loading: loading }
}

interface DescribeOSArtifactsProps {
  clusterId: string
  artifacts: Array<Types_CustomResourceObject>
}

interface OSArtifact {
  apiVersion: string
  kind: string
  metadata: Metadata
  spec: OSArtifactSpec
  status: {
    conditions: Array<{
      type: 'Ready' | string
      status: 'True' | 'False'
      reason: string
      message: string
    }>
    phase: string
  }
}

interface OSArtifactSpec {
  cloudConfigRef: { key: string; name: string }
  fileBundles: Record<string, string>
  imageName: string
  model: string
  outputImage: {
    registry: string
    repository: string
    tag: string
    username: string
    passwordSecretKeyRef: { key: string; name: string }
  }
}

const useDescribeOSArtifact = ({
  clusterId,
  artifacts,
}: DescribeOSArtifactsProps) => {
  const [items, setItems] = useState<Array<OSArtifact>>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<ApolloError | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const fetchedArtifacts: Array<OSArtifact> = []
      const client = KubernetesClient(clusterId ?? '')

      if (!client) {
        setLoading(false)
        return
      }

      for (const artifact of artifacts) {
        const { data, error } = await client.query({
          query: NamespacedResourceDocument,
          variables: {
            name: artifact.objectMeta.name,
            namespace: artifact.objectMeta.namespace,
            kind: artifact.typeMeta.kind,
          },
        })

        if (error) {
          setError(error)
          break
        }

        fetchedArtifacts.push(data?.handleGetResource?.Object)
      }

      setLoading(false)
      setItems(fetchedArtifacts)
    }

    if (artifacts?.length > 0) {
      fetchData()
    }
  }, [artifacts, clusterId])

  return { items, loading, error }
}

export type { OSArtifact }
export { useGetManagementCluster, useDescribeOSArtifact }
