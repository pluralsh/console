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

## Local OpenAI-compatible embeddings

The optional local embedding server packages the public
`nomic-ai/nomic-embed-text-v1.5` model and exposes TEI's OpenAI-compatible
endpoint. Enable it explicitly:

```yaml
ai:
  localEmbeddings:
    enabled: true
```

The service is available to in-namespace Console and AI proxy pods at:

```text
http://console-embedding-server:80/v1
```

Configure the existing Console deployment settings separately; enabling this
chart value does not select the embedding provider or write database-backed
settings:

```text
embedding_provider: openai_compatible
openai_compatible.base_url: http://console-embedding-server:80/v1
openai_compatible.embedding_model: nomic-ai/nomic-embed-text-v1.5
```

The endpoint is expected to return 512-dimensional embeddings. A custom
OpenAI-compatible image can be selected with
`ai.localEmbeddings.image.registry`, `ai.localEmbeddings.image.repository`,
and `ai.localEmbeddings.image.tag`; an empty registry uses `global.registry`.
The chart does not validate custom image behavior. The default image tag is
independent of the Console chart version. The default 8Gi memory limit and
approximately five-minute startup probe budget allow time for the baked model
to load on CPU nodes.

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| ai.localEmbeddings.affinity | object | `{}` | Pod affinity rules for the local embedding server. |
| ai.localEmbeddings.containerSecurityContext | object | See `values.yaml` | Container security context for the local embedding server. |
| ai.localEmbeddings.enabled | bool | `false` | Deploy the local OpenAI-compatible embedding server. |
| ai.localEmbeddings.extraArgs | list | `[]` | Additional TEI arguments. |
| ai.localEmbeddings.image.pullPolicy | string | `"IfNotPresent"` | Image pull policy. |
| ai.localEmbeddings.image.registry | string | `""` | Image registry; defaults to `global.registry`. |
| ai.localEmbeddings.image.repository | string | `"embedding-server"` | Embedding server image repository. |
| ai.localEmbeddings.image.tag | string | `"v0.1.0"` | Embedding server image tag. |
| ai.localEmbeddings.livenessProbe | object | See `values.yaml` | TEI liveness probe. |
| ai.localEmbeddings.nodeSelector | object | `{}` | Nodes on which to schedule the local embedding server. |
| ai.localEmbeddings.podAnnotations | object | `{}` | Pod annotations for the local embedding server. |
| ai.localEmbeddings.podLabels | object | `{}` | Pod labels for the local embedding server. |
| ai.localEmbeddings.podSecurityContext | object | `{}` | Pod security context for the local embedding server. |
| ai.localEmbeddings.readinessProbe | object | See `values.yaml` | TEI readiness probe. |
| ai.localEmbeddings.resources.limits.cpu | string | `"4"` | CPU limit. |
| ai.localEmbeddings.resources.limits.memory | string | `"8Gi"` | Memory limit. |
| ai.localEmbeddings.resources.requests.cpu | string | `"2"` | CPU request. |
| ai.localEmbeddings.resources.requests.memory | string | `"4Gi"` | Memory request. |
| ai.localEmbeddings.service.port | int | `80` | OpenAI-compatible service and container port. |
| ai.localEmbeddings.servedModelName | string | `"nomic-ai/nomic-embed-text-v1.5"` | Model name accepted by the embedding endpoint. |
| ai.localEmbeddings.startupProbe | object | See `values.yaml` | TEI startup probe used while loading the baked model. |
| ai.localEmbeddings.tolerations | list | `[]` | Pod tolerations for the local embedding server. |
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
