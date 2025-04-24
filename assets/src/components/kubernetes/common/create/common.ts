enum SecretType {
  Opaque = 'Opaque',
  DockerConfigJson = 'kubernetes.io/dockerconfigjson',
  ServiceAccountToken = 'kubernetes.io/service-account-token',
  Tls = 'kubernetes.io/tls',
  BootstrapToken = 'bootstrap.kubernetes.io/token',
}

function ToSecretYaml(
  name: string,
  namespace: string,
  type: SecretType = SecretType.Opaque,
  data?: Array<{ key: string; value: string }>
): string {
  const secret = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name,
      namespace,
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
