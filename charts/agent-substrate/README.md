# agent-substrate

Installs [Agent Substrate](https://github.com/agent-substrate/substrate) from the published
`ghcr.io/agent-substrate/substrate/<image>:<tag>` images, rendering what `ate-setup` applies from
`manifests/ate-install` plus the secrets and config it generates imperatively. The default
`appVersion` is Substrate **v1.0.0**.

It installs:

| Component | Objects |
| --- | --- |
| CRDs | `WorkerPool`, `SandboxConfig`, `CSIDriverConfig` from `crds/` (installed before the templates, never deleted by Helm) |
| ate-api-server | Deployment with the `objectstore-plugin` control sidecar, headless `api` Service, PDB, RBAC, `ate-api-config` / `ate-api-server-envvars` ConfigMaps |
| ate-controller | Deployment, `ate-controller` and `ate-client` service accounts, RBAC |
| ate-idp-server | Deployment, `idp` Service, PDB |
| atelet | DaemonSet with the `objectstore-plugin` node sidecar, optional kubelet image credential providers, `atelet-critical-pods` ResourceQuota |
| atenet-router | Deployment (router + Envoy), its Envoy config, GMP `PodMonitoring` where served |
| atenet-egress | Deployment (sdsmint, Envoy, ext-proc), the Envoy config with the credential providers and optional extra ext_proc filter spliced in |
| k8s-credential-provider | the bundled `k8s.io` egress credential provider, when listed |
| podcertificate-controller | its namespace, Deployment and RBAC |
| SandboxConfigs | `gvisor-default` (and optionally `microvm`), the `sandboxconfig-assets` ValidatingAdmissionPolicy |
| Postgres | a CloudNativePG `Cluster` (+ optional `ScheduledBackup`) and, optionally, the operator; or external DSNs |
| Object storage | S3, GCS or Azure Blob sidecar configuration; optionally an embedded RustFS for kind |
| Secrets hook | pre-install/pre-upgrade Job creating the CA pools, JWT pool, Postgres read-write password and authentication config |
| NetworkPolicies | Substrate's default-deny plus per-component allows, and allows for CNPG and RustFS |
| OTel | the shared `ate-otel-config` ConfigMap |

There is no Redis: Substrate keeps all its state in Postgres and object storage.

## Requirements

- Pod certificates: the pod-certificate controller issues every workload certificate. They are on
  by default from Kubernetes 1.37. On 1.34-1.36 they need the `ClusterTrustBundle`,
  `ClusterTrustBundleProjection` and `PodCertificateRequest` feature gates and
  `certificates.k8s.io/v1beta1`, which managed clusters (EKS, GKE, AKS) can't enable, so those
  need 1.37+. The secrets hook fails the install when `certificates.k8s.io` doesn't serve
  `podcertificaterequests` and `clustertrustbundles`.
- The release namespace **must be `ate-system`**: the Substrate binaries default every in-cluster
  address and SPIFFE ID to it. The chart fails to render anywhere else.
- Helm 3.14+.

## Install

```sh
helm repo add cnpg https://cloudnative-pg.github.io/charts
helm dependency build charts/agent-substrate

# kind / dev (RustFS + CNPG + gVisor):
helm upgrade --install ate charts/agent-substrate -n ate-system --create-namespace \
  -f charts/agent-substrate/ci/kind-values.yaml --wait --wait-for-jobs --timeout 20m

# or from the OCI registry:
helm upgrade --install ate oci://ghcr.io/pluralsh/charts/agent-substrate \
  --version 0.1.0 -n ate-system --create-namespace -f my-values.yaml --wait --wait-for-jobs
```

`hack/kind-up.sh` creates a suitable kind cluster (feature gates, parallel image pulls, proxy ARP
for gVisor) and runs the first command. `ci/` has reference values for EKS (`s3`), GKE (`gcs`), AKS
(`azureblob`) and managed Postgres (`external-postgres`).

### What happens on install

1. **Secrets hook** (`pre-install,pre-upgrade`, weight -10, after its own service account and RBAC
   at -20). An init container (`secretsHook.opensslImage`, `alpine/openssl`) generates candidate key
   material with the formats of Substrate's `internal/localca` and `internal/localjwtauthority`; the
   main container (`secretsHook.kubectlImage`, `alpine/kubectl`) then creates **only the secrets
   that don't exist**:

   | Secret | Namespace | Contents |
   | --- | --- | --- |
   | `actor-id-jwt-pool` | ate-system | ES256 (or RS256) JWT authority pool |
   | `actor-id-ca-pool` | ate-system | ECDSA P-256 CA pool (`kubernetes.io/tls`) |
   | `egress-mitm-ca-pool` | ate-system | ECDSA P-256 CA pool |
   | `service-dns-ca-pool`, `pod-identity-ca-pool`, `postgres-ca-pool` | podcertificate-controller-system | Ed25519 CA pools |
   | `<cnpg cluster>-readwrite` | ate-system | read-write login (`kubernetes.io/basic-auth`), cnpg mode only |

   It also rewrites the derived objects on every run: `actor-id-ca-certs` (the actor CA root) and
   the `ate-api-authentication` ConfigMap, trusting `auth.expectedJWTIssuer` or the issuer in the
   cluster's `/.well-known/openid-configuration` (with the in-cluster CA and token for
   `https://kubernetes.default.svc[.cluster.local]`), like `ate-setup`. Existing key material is never
   regenerated, so upgrades keep every CA and signing key; generating these in templates would
   rotate them on every upgrade. The images were chosen because they're small, maintained,
   multi-arch and each has exactly the tool its step needs (`sh` + `openssl`, `sh` + `kubectl`);
   both containers run as non-root with read-only root filesystems. The hook resources are deleted
   once it succeeds. Secrets it creates aren't Helm-managed, so `helm uninstall` keeps them.

2. **Resources.** The ate.dev CRDs (from `crds/`, ahead of everything else), workloads and, with
   `cloudnative-pg.enabled`, the CNPG operator and its CRDs. Helm only creates `crds/` CRDs that
   don't exist yet; upgrade them with `kubectl apply --server-side -f crds/` when bumping
   `appVersion`. Plural's agent applies them on every sync.

3. **Bootstrap Job.** A custom resource only renders inline when its CRD is served at render time,
   which on a first install (and under a plain `helm template`) it isn't. The
   `SandboxConfig`s and the CNPG `Cluster`/`ScheduledBackup` are then applied
   by the `agent-substrate-bootstrap` Job, which waits for the CRDs to be established and retries
   until CNPG's webhook serves. The objects carry Helm ownership metadata, so the next
   `helm upgrade` (when the CRDs are served at render time) renders them inline and adopts them, and
   the Job is no longer rendered. With `helm template`, pass
   `--api-versions ate.dev/v1/SandboxConfig --api-versions postgresql.cnpg.io/v1/Cluster` to render
   them inline.

### Uninstall

`helm uninstall ate -n ate-system` keeps the CRDs (and so every WorkerPool and SandboxConfig), the
CNPG `Cluster` and its volumes, the pod-certificate namespace and the generated secrets. Set
`postgres.cnpg.keepOnUninstall=false` before uninstalling to drop the `Cluster`, and delete the
CRDs with `kubectl delete -f crds/` afterwards.

## Postgres

### CloudNativePG (`postgres.mode: cnpg`, default)

The chart renders a CNPG `Cluster` named `postgres.cnpg.clusterName` (`ate-postgres`) replacing
Substrate's bundled StatefulSet:

- `bootstrap.initdb` creates the `atepg` database and the owner login `substrate_owner_user`, and
  `postInitApplicationSQL` creates the `substrate_owner`/`substrate_readwrite` roles and the
  `substrate` schema with the same grants as `ate-setup`'s bootstrap.
- `managed.roles` creates the `substrate_readwrite_user` login (member of `substrate_readwrite`,
  `NOINHERIT`) with the password the secrets hook generated.
- ate-api-server builds both DSNs from the CNPG secrets (`<cluster>-app` for the owner,
  `<cluster>-readwrite` for read-write) against `<cluster>-rw.ate-system.svc` with
  `sslmode=verify-full`, trusting the cluster CA from `<cluster>-ca`.
- `clusterSize: size10` (or `postgres.cnpg.preset: size10`) applies ate-setup's `postgres-size10`
  parameters and resources and adds `pool_max_conns=64&pool_min_conns=4` to the DSNs.
- `postgres.cnpg.backup` enables barman backups to an `s3://`, `gs://` or Azure Blob path with the
  pod identity of `objectStore.backend` (IRSA, Workload Identity, Entra), static S3 credentials, or
  the embedded RustFS. Annotate `postgres.cnpg.serviceAccountAnnotations` for the identity.

The operator comes from the optional `cloudnative-pg` dependency (`cloudnative-pg.enabled`, on by
default). Turn it off where the operator already runs: it's cluster-wide and two copies conflict.
With it off the chart fails at render time unless the `clusters.postgresql.cnpg.io` CRD is served.

### External (`postgres.mode: external`)

Point `postgres.external.readWrite` (and optionally `owner`, which defaults to the same secret) at
secrets holding full DSNs, and give the server CA as `postgres.external.serverCA.pem` or an existing
`serverCA.secretName`. It's mounted at `/run/postgres-server-ca/server-ca.pem` for
`sslmode=verify-full&sslrootcert=/run/postgres-server-ca/server-ca.pem` DSNs. The database must
already have the roles and schema `ate-setup`'s bootstrap creates.

## Object storage

`objectStore.snapshotLocation` is the cluster snapshot location; it's required unless the
`PerTemplateSnapshotLocation` preview gate is on and must match the backend's scheme.

- **`s3`** (`s3://bucket/prefix/`): IRSA or EKS Pod Identity through
  `apiServer.serviceAccount.annotations`/`atelet.serviceAccount.annotations`, or static keys in
  `objectStore.s3.credentialsSecret`. `endpoint` and `usePathStyle` cover S3-compatible stores.
- **`gcs`** (`gs://bucket/prefix/`): GKE Workload Identity through the same service-account
  annotations; `apiServer.snapshotTransferServiceAccount` names the GCP service account the plugin's
  credential exchange hands out.
- **`azureBlob`** (`azblob://container/prefix/`): the
  [objectstore-azure-blob](https://github.com/agent-substrate-plugins/objectstore-azure-blob) plugin.
  The chart does what the plugin's kustomize `config/` component does: it swaps the image and
  arguments of both `objectstore-plugin` sidecars (`node` next to atelet, `control` next to
  ate-api-server), removes `ATE_STORAGE_BACKEND`, projects a service account token with audience
  `api://AzureADTokenExchange` into both, sets `AZURE_TENANT_ID`, `AZURE_FEDERATED_TOKEN_FILE` and a
  separate `AZURE_CLIENT_ID` per sidecar (`nodeClientId`, `controlClientId`), points the startup
  probes at `azure-blob-objectstore-plugin healthcheck` and keeps the
  `ATE_API_SNAPSHOT_TRANSFER_SERVICE_ACCOUNT` key. `assetContainers` adds the `config/assets`
  component's `AZURE_STORAGE_ASSET_CONTAINERS`. The chart enforces the plugin's constraints:
  Substrate must serve `substrate.objectstore.v1` (v1.0.0+, or force `objectstoreV1Support`),
  `accountUrl` must be `https`, and the image must be pinned by `digest` (or `tag`). Federate both
  client IDs with `system:serviceaccount:ate-system:atelet` and
  `system:serviceaccount:ate-system:ate-api-server` on the AKS OIDC issuer.
- **`rustfs.enabled`** (kind and dev only): an S3-compatible RustFS Deployment, its bucket (created
  by the `rustfs-bucket-init` Job) and credentials, with `snapshotLocation` defaulting to
  `s3://<bucket>/`.

## Devbox settings

| Setting | Values |
| --- | --- |
| Private actor images (section 4.1a) | `atelet.imageCredentialProvider` with `preset: ecr`, `gar`, `acr` or `custom`. It renders a kubelet `CredentialProviderConfig` (`kubelet.config.k8s.io/v1`) for `atelet --image-credential-provider-config` and mounts the provider binaries from the node (`binDir`). atelet runs the exec plugins in its own container, so they authenticate as atelet's pod: annotate `atelet.serviceAccount.annotations` for IRSA / Workload Identity. Override `matchImages`, `args`, `env`, `defaultCacheDuration`; `custom` takes `providers` verbatim. |
| Devboxes preset | `devboxes.enabled: true` fills in the settings below for the deployment-operator's `devbox-gateway` (see [Devboxes](#devboxes)) |
| Egress credential providers | `atenet.egress.credentialProviders`: `k8s.io` (bundled) and e.g. `{name: plural.sh, address: devbox-gateway.plrl-deploy-operator.svc:50052}` |
| Extra ext_proc filter | `atenet.egress.additionalExtprocService` (e.g. `plrl-deploy-operator/devbox-egress-authz:50053`), spliced into the egress Envoy config at Substrate's `#ATE_MITM_EXTPROC_*` markers like `ate-setup` does |
| SPIFFE IDs | `atenet.router.ingressAllowedSPIFFEIDs`, `auth.egressGatewayExtraSPIFFEIDs` (e.g. `spiffe://cluster.local/ns/plrl-deploy-operator/sa/devbox-gateway`) |
| Route timeout | `atenet.router.routeTimeout` |
| Preview gates | `previewGates`, passed as `--preview=` to every Substrate container |
| Dataplane | `atenet.dataplane: envoy` |
| System-infra scheduling | `systemInfra.*` (`cordon` applies ate-setup's `--cordon-system-infra-components`) |
| Telemetry | `otel.endpoint` (empty disables export), `logLevel` and per-component `logLevel` |

Checksum annotations on the pod templates roll workloads when their config changes (replacing
`ate-setup`'s env-hash annotation).

### Devboxes

The deployment-operator runs `devbox-gateway` in its own namespace: Service `devbox-gateway` (the
`plural.sh` credential provider, port 50052), Service `devbox-egress-authz` (the ext_proc filter,
port 50053) and ServiceAccount `devbox-gateway`. Its DevboxRunner `SubstrateInstall` condition
checks that Substrate is wired to them. `devboxes.enabled: true` sets, with
`<ns>` = `devboxes.gatewayNamespace` (default `plrl-deploy-operator`):

| Value | Preset |
| --- | --- |
| `atenet.egress.credentialProviders` | `k8s.io` and `{name: plural.sh, address: devbox-gateway.<ns>.svc:50052}` |
| `atenet.egress.additionalExtprocService` | `<ns>/devbox-egress-authz:50053` |
| `atenet.router.ingressAllowedSPIFFEIDs` | `[spiffe://cluster.local/ns/<ns>/sa/devbox-gateway]` |
| `auth.egressGatewayExtraSPIFFEIDs` | `[spiffe://cluster.local/ns/<ns>/sa/devbox-gateway]` |
| `atenet.router.routeTimeout` | `devboxes.routeTimeout` (`1h`) |
| `atenet.egress.additionalExtprocAllowModeOverride` | `true` |
| `auth.bootstrapOwners` | adds `system:serviceaccount:<operator ns>:<operator name>` from `devboxes.operatorServiceAccount` (default `plrl-deploy-operator/deployment-operator`) |

A value you set explicitly wins over the preset. Lists are replaced, not merged, so an explicit
`credentialProviders` must list `k8s.io` and `plural.sh` itself. `auth.bootstrapOwners` is the
exception: the operator's ServiceAccount, which creates atespaces and so must be a global owner, is
added to the explicit owners (or to the default `ate-client` when there are none), deduplicated.
Set `devboxes.operatorServiceAccount: ""` to add nothing.

`allow_mode_override` on the spliced ext_proc filter lets `devbox-egress-authz` ask, per request,
for the response headers of a pull request it allowed, to attribute the created PR. The filter
still defaults to `response_header_mode: SKIP`. Substrate itself has no setting for this: `ate-setup`
hard-codes the filter, which the chart renders the same way.

Both the `plural.sh` provider and the ext_proc filter are dialed over mTLS with the servicedns
signer's trust bundle (`/run/servicedns.podcert.ate.dev/trust-bundle.pem`), expecting the DNS names
`devbox-gateway.<ns>.svc` and `devbox-egress-authz.<ns>.svc`. There's no value for another CA.

End to end on a cluster (e.g. `hack/kind-up.sh`), in this order:

1. Install agent-substrate with the preset, which also makes the operator's ServiceAccount a
   bootstrap owner:

   ```bash
   helm upgrade --install ate charts/agent-substrate -n ate-system --create-namespace \
     -f charts/agent-substrate/ci/kind-values.yaml --wait --wait-for-jobs --timeout 20m
   ```

   Outside kind, use your own values with `--set devboxes.enabled=true`. If the operator isn't
   the `deployment-operator` ServiceAccount in `plrl-deploy-operator`, set
   `devboxes.operatorServiceAccount=<ns>/<name>` (and `devboxes.gatewayNamespace`).

2. Install or upgrade the deployment-operator with devboxes enabled, in the gateway namespace:

   ```bash
   helm upgrade --install deployment-operator ../deployment-operator/charts/deployment-operator \
     -n plrl-deploy-operator --create-namespace \
     --set devboxes.enabled=true \
     --set consoleUrl=https://console.example.com/ext/gql \
     --set secrets.deployToken=<deploy token> --set clusterId=<cluster id>
   ```

   `devboxes.substrate.namespace` / `.apiAddress` default to `ate-system` /
   `api.ate-system.svc:443`; change them if Substrate runs elsewhere.

3. Apply a DevboxRunner (cluster-scoped) and check its conditions:

   ```bash
   kubectl apply -f go/deployment-operator/config/samples/devboxRunner.yaml
   kubectl get devboxrunner platform \
     -o jsonpath='{.status.conditions[?(@.type=="SubstrateInstall")]}'
   ```

   `SubstrateInstall=False` names the missing setting; fix it with a `helm upgrade` of
   agent-substrate and the operator re-checks on its next reconcile.

`hack/test.sh` runs the same three checks as the operator against every `ci/` file with
`devboxes.enabled: true`.

### JuiceFS homes

`juicefs.enabled: true` (opt-in; `juicefs.image.tag` is pinned to the chart's deployment-operator release) adds a JuiceFS filesystem a
DevboxRunner can keep `/home/dev` in instead of in its snapshots (`spec.home.storage: JuiceFS`,
capped at `spec.home.size`, default `spec.resources.disk`). It reuses the chart's Postgres and
bucket:

- **Metadata** lives in its own database and login role (`juicefs.postgres.{database,user}`) on the
  CNPG cluster, or in a database you created with `postgres.mode: external`
  (`juicefs.postgres.external`).
- **Data** goes under `<juicefs.name>/` in the snapshot bucket (or `juicefs.bucket`) on every
  `objectStore.backend`. It authenticates as ServiceAccount `devbox-juicefs` (annotate
  `juicefs.serviceAccount.annotations`; `juicefs.azureClientId` for Azure) or with the static S3
  keys.
- **`devbox-juicefs`** is a CSI driver (`juicefs.devbox.plural.sh`) that holds those credentials
  itself, so its StorageClass `juicefs.storageClassName` carries no secrets. A controller Deployment
  creates, clones and deletes homes over one root mount. A node DaemonSet (`updateStrategy:
  OnDelete`, because restarting it unmounts every home on the node) gives each home its own
  `juicefs mount` with its cache under `juicefs.node.cacheDir`. The chart turns on Substrate's
  `ExternalVolumes` preview gate.

For each template revision, the operator creates a StorageClass `devbox-home.<atespace>.<template>`
that copies this one and adds a `seed` parameter. The first home provisioned from it belongs to the
revision's golden boot. When Substrate deletes the golden actor after tagging it, the driver clones
that home into the seed, and every later instance of the revision starts from a clone of it, with
the bootstrap script's clones and builds already there. Snapshots also save the home as a seed, but
starting from a snapshot fails with `UNSUPPORTED` until Substrate can restore tags of templates
with external volumes.

The operator needs `get`, `create` and `delete` on `storageclasses.storage.k8s.io` for these.

### ZeroFS homes

`zerofs.enabled: true` (opt-in; `zerofs.image.tag` is pinned to the chart's deployment-operator release) adds a second home driver,
`zerofs.devbox.plural.sh` (StorageClass `zerofs.storageClassName`), with no metadata database. Each
home is its own [ZeroFS](https://www.zerofs.net) filesystem under
`<zerofs.prefix>/homes/<volume>/` in the snapshot bucket (or `zerofs.storageUrl`), encrypted with
the password in `devbox-zerofs-encryption`. The secrets hook generates that secret once, or you can
supply your own with `zerofs.encryption.existingSecret`. Losing the password loses every home.
Both pods reach the bucket as ServiceAccount `devbox-zerofs`. Give it its own workload identity
with list, get, put and delete on the bucket: an EKS Pod Identity association, or
`zerofs.serviceAccount.annotations` for IRSA or Workload Identity (`zerofs.azureClientId` for Azure).
Without one, the pods fall back to the node's credentials, and CreateVolume fails with `AccessDenied`.

- **The controller** (`devbox-zerofs-controller`, unprivileged) passes a home's size and owner to
  the node and deletes the home's objects when Substrate deletes the volume. Only ate-api-server can
  call it.
- **The node plugin** (`devbox-zerofs-node`) is a privileged DaemonSet that runs only where atelet
  runs: it defaults to atelet's `nodeSelector`, `tolerations` and `affinity`, so nodes without
  devboxes pay nothing for it. Atelet reaches it through the plugin socket on its own node. Staging a
  home starts a `zerofs run` writer for it, with its own cache under `zerofs.node.stateDir`. The
  plugin attaches the home's block device to a free `/dev/nbdN`, formats it as ext4 the first time,
  and mounts it at atelet's staging path. Publishing bind-mounts that into the actor. Unstaging
  unmounts the home, disconnects the device and stops the writer, which flushes to the bucket, so
  the home can be staged on any other node. `updateStrategy` is `OnDelete`, because restarting the
  plugin ends every home on the node.

A DevboxRunner uses it with `spec.home.storage: ZeroFS`. Each template revision gets a seeded
StorageClass as with [JuiceFS](#juicefs-homes). The first home from it is the golden boot's. When
Substrate deletes it, the controller copies its objects to `<zerofs.prefix>/seeds/<seed>/`, and every
later home of the revision starts from a server-side copy of that prefix. Snapshots don't save the
home, and starting from a snapshot fails with `UNSUPPORTED`. CreateVolume with a content source
fails with `UNIMPLEMENTED`. Homes still count against `spec.resources.disk`, because each writer's
cache sits on node disk.

## Values

Every value is documented in [`values.yaml`](values.yaml) and typed in
[`values.schema.json`](values.schema.json). The main ones:

| Key | Default | Description |
| --- | --- | --- |
| `substrateVersion` | chart `appVersion` | Substrate release; image tags and feature gates follow it |
| `image.registry` | `ghcr.io/agent-substrate/substrate` | image prefix |
| `image.tag` / `images.<name>.{repository,tag,digest}` | | per-image overrides |
| `logLevel` | `info` | default log level |
| `previewGates` | `[]` | `--preview` gates |
| `clusterSize` | `size0` | `size0` or `size10` |
| `systemInfra.{cordon,nodeSelector,tolerations,affinity,topologySpreadConstraints}` | | system-infra scheduling |
| `otel.endpoint`, `otel.extraEnv` | `""` | OTLP endpoint and extra OTel env |
| `auth.expectedJWTIssuer` | discovered | service account issuer ate-api-server trusts |
| `auth.bootstrapOwners` | `ate-client` SA | `--authz-bootstrap-owners` (plus the operator's SA with `devboxes.enabled`) |
| `auth.actorJWTIssuer`, `auth.actorJWTAlgorithm` | `https://idp.ate-system.svc`, `ES256` | actor ID JWTs |
| `auth.egressGatewayExtraSPIFFEIDs` | `[]` | extra `--egress-gateway-spiffe-id`s |
| `apiServer.*` | 2 replicas | replicas, resources, service account annotations, `snapshotTransferServiceAccount`, `postgresPoolMaxConns`, extra args/env, PDB |
| `controller.*`, `idpServer.*` | | replicas, resources, log level, extra args |
| `atelet.*` | | resources, tolerations, scheduling, `objectstorePlugin.assetStagingCapacity` (`8Gi`), `imageCredentialProvider` |
| `atelet.snapshots.{uploadDelay,detachDelay}`, `atelet.{snapshotCacheMaxBytes,sandboxAssetCacheMaxBytes}` | `5m`, `10m`, 50Gi, 10Gi | how long suspended actors' snapshots stay on the node, and the node file cache budgets (0 is unbounded) |
| `atenet.router.*` | | `routeTimeout`, `ingressAllowedSPIFFEIDs`, resources, `monitoring.enabled` (`auto`) |
| `atenet.egress.*` | `k8s.io` provider | `credentialProviders`, `additionalExtprocService`, `additionalExtprocAllowModeOverride`, `envoyConcurrency`, resources |
| `devboxes.{enabled,gatewayNamespace,routeTimeout,operatorServiceAccount}` | `false`, `plrl-deploy-operator`, `1h`, `plrl-deploy-operator/deployment-operator` | [devboxes preset](#devboxes) |
| `k8sCredentialProvider.namespacePolicies` | `[]` | atespace allow-list |
| `podCertificateController.*` | | namespace, workers, QPS/burst |
| `sandboxConfigs.gvisor.enabled` / `.microvm.*` | `true` / `false` | SandboxConfigs (microVM assets must already be staged) |
| `networkPolicies.enabled` | `true` | NetworkPolicies |
| `postgres.mode` | `cnpg` | `cnpg` or `external` |
| `postgres.cnpg.{instances,storage,walStorage,preset,resources,parameters,affinity,backup,keepOnUninstall}` | 1 instance, 20Gi | CNPG Cluster |
| `postgres.external.{readWrite,owner,serverCA}` | | external DSNs and CA |
| `objectStore.backend`, `objectStore.snapshotLocation` | `s3`, `""` | snapshot storage |
| `objectStore.s3.*`, `objectStore.azureBlob.*` | | backend settings |
| `rustfs.*` | disabled | embedded RustFS |
| `juicefs.*` | disabled | [JuiceFS homes](#juicefs-homes): image, `name`, `storageClassName`, `bucket`, `postgres`, `home.{uid,gid,mode}`, controller and node `mountFlags`/`resources` |
| `zerofs.*` | disabled | [ZeroFS homes](#zerofs-homes): image, `storageClassName`, `storageUrl`/`prefix`, `encryption.existingSecret`, `home.{uid,gid,mode}`, node cache sizes, `nbdClientFlags`, `objectStoreOptions` and scheduling |
| `secretsHook.{opensslImage,kubectlImage,caValidityDays}` | `alpine/openssl:3.5.9`, `alpine/kubectl:1.37.2`, 365 | secrets hook |
| `bootstrapJob.image` | `alpine/kubectl:1.37.2` | first-install bootstrap Job |
| `cloudnative-pg.enabled` | `true` | bundle the CNPG operator |

## Differences from `ate-setup`

- The API config and env ConfigMaps are Helm-rendered; the authentication config is written by the
  secrets hook (it needs the cluster's discovered issuer).
- Only the Envoy dataplane is implemented; `atenet.dataplane: agentgateway` fails to render.
- `microvm` SandboxConfig assets aren't staged by the chart (`ate-setup deploy sandboxconfig` does).
- `size10` pool parameters are added to CNPG DSNs only; external DSNs are used as given.
- The `acr` preset reads the node's `/etc/kubernetes/azure.json`; verify it on your AKS node image.
- CNPG backups use the in-tree `barmanObjectStore`, deprecated upstream in favour of the Barman
  Cloud plugin.

## Development

- `hack/sync-upstream.sh [SUBSTRATE_DIR] [REF]` copies the CRDs into `crds/` and the Envoy
  configs and SandboxConfigs into `files/` from a Substrate checkout (recorded in `files/UPSTREAM`);
  `--check` fails on drift.
- `hack/test.sh` runs `helm lint`, `helm template` and kubeconform for every `ci/` file, the
  helm-unittest suites in `tests/`, and the secrets hook scripts against a fake kubectl
  (`hack/test-hook-scripts.sh`).
- `hack/kind-up.sh` creates a kind cluster and installs the chart.
