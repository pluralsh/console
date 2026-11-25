{{- define "substrate.juicefs.driverName" -}}juicefs.devbox.plural.sh{{- end -}}

{{- define "substrate.juicefs.image" -}}
{{- $i := .Values.juicefs.image -}}
{{- if $i.digest }}{{ printf "%s@%s" $i.repository $i.digest }}{{ else }}{{ printf "%s:%s" $i.repository $i.tag }}{{ end -}}
{{- end -}}

{{- define "substrate.juicefs.passwordSecret" -}}
{{- printf "%s-juicefs" .Values.postgres.cnpg.clusterName -}}
{{- end -}}

{{/* The bucket the snapshot location names: its host. */}}
{{- define "substrate.juicefs.snapshotBucket" -}}
{{- (urlParse (include "substrate.snapshotLocation" .)).host -}}
{{- end -}}

{{/* `juicefs format --storage`. */}}
{{- define "substrate.juicefs.storage" -}}
{{- $b := .Values.objectStore.backend -}}
{{- if eq $b "gcs" }}gs{{ else if eq $b "azureBlob" }}wasb{{ else }}s3{{ end -}}
{{- end -}}

{{/*
`juicefs format --bucket`: path style against a custom S3 endpoint (RustFS
included), virtual-hosted against AWS, gs://<bucket> and the container's host
on Azure Blob.
*/}}
{{- define "substrate.juicefs.bucket" -}}
{{- $j := .Values.juicefs -}}
{{- $os := .Values.objectStore -}}
{{- $bucket := include "substrate.juicefs.snapshotBucket" . -}}
{{- if $j.bucket -}}
{{- $j.bucket -}}
{{- else if eq $os.backend "gcs" -}}
{{- printf "gs://%s" $bucket -}}
{{- else if eq $os.backend "azureBlob" -}}
{{- $account := (urlParse $os.azureBlob.accountUrl).host -}}
{{- printf "https://%s.%s" $bucket (regexReplaceAll "^[^.]+\\." $account "") -}}
{{- else if .Values.rustfs.enabled -}}
{{- printf "http://rustfs.%s.svc:9000/%s" (include "substrate.namespace" .) $bucket -}}
{{- else if $os.s3.endpoint -}}
{{- printf "%s/%s" (trimSuffix "/" $os.s3.endpoint) $bucket -}}
{{- else -}}
{{- printf "https://%s.s3.%s.amazonaws.com" $bucket $os.s3.region -}}
{{- end -}}
{{- end -}}

{{/* `juicefs format --access-key`: only Azure Blob's account name; the rest use the pod's identity. */}}
{{- define "substrate.juicefs.accessKey" -}}
{{- if eq .Values.objectStore.backend "azureBlob" -}}
{{- regexReplaceAll "\\..*$" (urlParse .Values.objectStore.azureBlob.accountUrl).host "" -}}
{{- end -}}
{{- end -}}

{{- define "substrate.juicefs.metaURL" -}}
{{- $j := .Values.juicefs -}}
{{- if eq .Values.postgres.mode "cnpg" -}}
{{- printf "postgres://%s@%s:5432/%s?sslmode=verify-full&sslrootcert=/run/postgres-server-ca/server-ca.pem" $j.postgres.user (include "substrate.cnpg.host" .) $j.postgres.database -}}
{{- else -}}
{{- $j.postgres.external.url -}}
{{- end -}}
{{- end -}}

{{/* SPIFFE IDs allowed to call the controller. */}}
{{- define "substrate.juicefs.allowedClients" -}}
{{- $out := .Values.juicefs.allowedClients -}}
{{- if not $out -}}
{{- $out = list (include "substrate.spiffeID" (list (include "substrate.namespace" .) "ate-api-server")) -}}
{{- if .Values.devboxes.enabled -}}
{{- $out = append $out (include "substrate.spiffeID" (list .Values.devboxes.gatewayNamespace "devbox-gateway")) -}}
{{- end -}}
{{- end -}}
{{- join "," $out -}}
{{- end -}}

{{/* Env both plugins share: the metadata store and the bucket's credentials. */}}
{{- define "substrate.juicefs.env" -}}
{{- $j := .Values.juicefs -}}
{{- $os := .Values.objectStore -}}
- name: JUICEFS_META_URL
  value: {{ include "substrate.juicefs.metaURL" . | quote }}
- name: META_PASSWORD
  valueFrom:
    secretKeyRef:
      {{- if eq .Values.postgres.mode "cnpg" }}
      name: {{ include "substrate.juicefs.passwordSecret" . }}
      key: password
      {{- else }}
      name: {{ $j.postgres.external.passwordSecret.name }}
      key: {{ $j.postgres.external.passwordSecret.key }}
      {{- end }}
{{- if eq $os.backend "s3" }}
{{ include "substrate.objectstoreBackendEnv" . }}
{{- else if eq $os.backend "azureBlob" }}
- name: AZURE_CLIENT_ID
  value: {{ $j.azureClientId | quote }}
- name: AZURE_TENANT_ID
  value: {{ $os.azureBlob.tenantId | quote }}
- name: AZURE_FEDERATED_TOKEN_FILE
  value: /var/run/secrets/azure/tokens/azure-identity-token
{{- end }}
{{- end -}}

{{- define "substrate.juicefs.volumeMounts" -}}
- name: postgres-server-ca
  mountPath: /run/postgres-server-ca
  readOnly: true
{{- if eq .Values.objectStore.backend "azureBlob" }}
- name: azure-identity-token
  mountPath: /var/run/secrets/azure/tokens
  readOnly: true
{{- end }}
{{- end -}}

{{- define "substrate.juicefs.volumes" -}}
{{- include "substrate.postgres.serverCAVolume" . }}
{{- include "substrate.azureTokenVolume" . }}
{{- end -}}

{{/* The CSIDriverConfig ate-api-server and atelet find the driver through. */}}
{{- define "substrate.juicefs.csiDriverConfig" -}}
{{- $ns := include "substrate.namespace" . -}}
apiVersion: ate.dev/v1
kind: CSIDriverConfig
metadata:
  name: {{ include "substrate.juicefs.driverName" . }}
  labels:
    {{- include "substrate.labels" . | nindent 4 }}
spec:
  driverName: {{ include "substrate.juicefs.driverName" . }}
  controllerEndpoint: {{ printf "tcp://devbox-juicefs.%s.svc:9820" $ns }}
  tls:
    enabled: true
    usePodIdentity: true
    serverName: {{ printf "devbox-juicefs.%s.svc" $ns }}
{{- end -}}

{{- define "substrate.csiDriverConfigCRDServed" -}}
{{- if .Capabilities.APIVersions.Has "ate.dev/v1/CSIDriverConfig" -}}true{{- end -}}
{{- end -}}
