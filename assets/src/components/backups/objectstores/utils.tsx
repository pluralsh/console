import { styledTheme } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import { getProviderIconUrl } from '../../utils/Provider'
import { ObjectStore, ObjectStoreAttributes } from '../../../generated/graphql'

export enum ObjectStoreCloud {
  S3 = 's3',
  GCS = 'gcs',
  Azure = 'azure',
}

export const SUPPORTED_CLOUDS = [
  ObjectStoreCloud.S3,
  ObjectStoreCloud.Azure,
  ObjectStoreCloud.GCS,
] as const satisfies readonly ObjectStoreCloud[]

export const objectStoreCloudToDisplayName = {
  [ObjectStoreCloud.S3]: 'AWS',
  [ObjectStoreCloud.Azure]: 'Azure',
  [ObjectStoreCloud.GCS]: 'GCP',
}

const objectStoreCloudToProviderCloud = {
  [ObjectStoreCloud.S3]: 'aws',
  [ObjectStoreCloud.Azure]: 'azure',
  [ObjectStoreCloud.GCS]: 'gcp',
}

export function getObjectStoreCloud(
  objectStore: ObjectStore | null | undefined
) {
  if (objectStore?.azure) {
    return ObjectStoreCloud.Azure
  }
  if (objectStore?.s3) {
    return ObjectStoreCloud.S3
  }
  if (objectStore?.gcs) {
    return ObjectStoreCloud.GCS
  }

  return null
}

export function getObjectStoreCloudAttributes(
  os: ObjectStore | null | undefined
): Omit<ObjectStoreAttributes, 'name'> {
  if (os?.azure) {
    return {
      azure: {
        clientId: os.azure.clientId,
        clientSecret: '',
        subscriptionId: os.azure.subscriptionId,
        tenantId: os.azure.tenantId,
        storageAccount: os.azure.storageAccount,
        container: os.azure.container,
      },
    }
  }
  if (os?.s3) {
    return {
      s3: {
        accessKeyId: os.s3.accessKeyId,
        secretAccessKey: '',
        endpoint: os.s3.endpoint,
        region: os.s3.region,
        bucket: os.s3.bucket,
      },
    }
  }
  if (os?.gcs) {
    return {
      gcs: {
        applicationCredentials: '',
        region: os.gcs.region,
        bucket: os.gcs.bucket,
      },
    }
  }

  return {}
}

export function getObjectStoreIconUrl(
  cloud: ObjectStoreCloud,
  mode: typeof styledTheme.mode
) {
  return getProviderIconUrl(objectStoreCloudToProviderCloud[cloud], mode)
}

export function ObjectStoreCloudIcon({
  cloud,
  size = 16,
}: {
  cloud: ObjectStoreCloud
  size?: number
}) {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        justifyContent: 'center',
        height: size,
      }}
    >
      <img
        alt={cloud}
        src={getObjectStoreIconUrl(cloud, theme.mode)}
      />
    </div>
  )
}
