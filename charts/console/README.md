# Plural Console

Sets up an installation of the Plural Console directly into a Kubernetes cluster. The console serves as a combination of a Kubernetes dashboard, continuous deployment system and general Kubernetes fleet manager.  We recommend using this chart if you'd rather control your management cluster fully, otherwise set up the management cluster using Plural itself and also benefit from self-service open source installation alongside.

## Helm Repository Info

To add the repository, simply run:

```sh
helm repo add plrl-console https://pluralsh.github.io/console
helm repo update
```

We recommend you use the `plural` cli to initialize the basic values, which you can install using the instructions [here](https://docs.plural.sh/getting-started/quickstart#install-plural-cli) or directly from the releases page in our [github repo](https://github.com/pluralsh/plural-cli/) for the cli.  Then you can run:

```sh
plural login
plural cd control-plane
```

to generate your values file and install from there.

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].podAffinityTerm.labelSelector.matchExpressions[0].key | string | `"app.kubernetes.io/name"` |  |
| affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].podAffinityTerm.labelSelector.matchExpressions[0].operator | string | `"In"` |  |
| affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].podAffinityTerm.labelSelector.matchExpressions[0].values[0] | string | `"console"` |  |
| affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].podAffinityTerm.topologyKey | string | `"kubernetes.io/hostname"` |  |
| affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].weight | int | `100` |  |
| cliContainer.enabled | bool | `false` |  |
| cliContainer.image.repository | string | `"ghcr.io/pluralsh/plural-cli"` |  |
| cliContainer.image.tag | string | `"latest"` |  |
| dbPasswordSecret | string | `"console.plural-console.credentials.postgresql.acid.zalan.do"` |  |
| extraSecretEnv | list | `[]` |  |
| fullnameOverride | string | `""` |  |
| homeDir | string | `"/root"` |  |
| image.imagePullPolicy | string | `"IfNotPresent"` |  |
| image.repository | string | `"dkr.plural.sh/console/console"` |  |
| image.tag | string | `nil` |  |
| imagePullSecrets | list | `[]` |  |
| ingress.annotations."cert-manager.io/cluster-issuer" | string | `"letsencrypt-prod"` |  |
| ingress.annotations."kubernetes.io/tls-acme" | string | `"true"` |  |
| ingress.annotations."nginx.ingress.kubernetes.io/affinity" | string | `"cookie"` |  |
| ingress.annotations."nginx.ingress.kubernetes.io/force-ssl-redirect" | string | `"true"` |  |
| ingress.annotations."nginx.ingress.kubernetes.io/proxy-read-timeout" | string | `"3600"` |  |
| ingress.annotations."nginx.ingress.kubernetes.io/proxy-send-timeout" | string | `"3600"` |  |
| ingress.annotations."nginx.ingress.kubernetes.io/session-cookie-path" | string | `"/socket"` |  |
| ingress.enabled | bool | `true` |  |
| ingress.ingressClass | string | `"nginx"` |  |
| initContainer.image.repository | string | `"gcr.io/pluralsh/library/busybox"` |  |
| initContainer.image.tag | string | `"1.35.0"` |  |
| livenessProbe.failureThreshold | int | `3` |  |
| livenessProbe.httpGet.path | string | `"/health"` |  |
| livenessProbe.httpGet.port | string | `"http"` |  |
| livenessProbe.initialDelaySeconds | int | `15` |  |
| livenessProbe.periodSeconds | int | `10` |  |
| livenessProbe.successThreshold | int | `1` |  |
| livenessProbe.timeoutSeconds | int | `1` |  |
| monitoring.enabled | bool | `false` |  |
| nameOverride | string | `""` |  |
| nodeSelector | object | `{}` |  |
| postgres.dsnKey | string | `"dsn"` |  |
| postgres.dsnSecret | string | `"postgres-dsn"` |  |
| postgres.host | string | `"CHANGEME"` |  |
| postgres.passwordSecret | string | `"postgres-password"` |  |
| postgres.port | int | `5432` |  |
| provider | string | `"custom"` |  |
| readinessProbe.failureThreshold | int | `3` |  |
| readinessProbe.httpGet.path | string | `"/health"` |  |
| readinessProbe.httpGet.port | string | `"http"` |  |
| readinessProbe.initialDelaySeconds | int | `15` |  |
| readinessProbe.periodSeconds | int | `10` |  |
| readinessProbe.successThreshold | int | `1` |  |
| readinessProbe.timeoutSeconds | int | `1` |  |
| replicaCount | int | `2` |  |
| resources.requests.cpu | string | `"100m"` |  |
| resources.requests.memory | string | `"250Mi"` |  |
| service.port | int | `4000` |  |
| service.type | string | `"ClusterIP"` |  |
| serviceAccount.annotations | object | `{}` |  |
| serviceAccount.create | bool | `true` |  |
| shutdownDelay | int | `30` |  |
| tolerations | list | `[]` |  |

