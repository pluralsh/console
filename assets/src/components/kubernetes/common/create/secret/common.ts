enum SecretType {
  Opaque = 'Opaque',
  DockerConfigJson = 'kubernetes.io/dockerconfigjson',
  ServiceAccountToken = 'kubernetes.io/service-account-token',
  SSH = 'kubernetes.io/ssh-auth',
  BasicAuth = 'kubernetes.io/basic-auth',
  TLS = 'kubernetes.io/tls',
  BootstrapToken = 'bootstrap.kubernetes.io/token',
}

interface SecretData {
  name: string
  namespace: string
  type: SecretType
  serviceAccount?: string
  data?: Array<{ key: string; value: string }>
}

function ToSecretYaml({
  name,
  namespace,
  type,
  serviceAccount,
  data,
}: SecretData): string {
  const secret = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name,
      namespace,
      ...(type === SecretType.ServiceAccountToken && {
        annotations: {
          'kubernetes.io/service-account.name': serviceAccount,
        },
      }),
    },
    type,
    stringData:
      data?.reduce((acc, { key, value }) => {
        if (key) acc[key] = value
        return acc
      }, {}) ?? {},
  }

  return JSON.stringify(secret, null, 2)
}

export { ToSecretYaml, SecretType }
