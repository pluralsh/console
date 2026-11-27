{{- define "substrate.zerofs.driverName" -}}zerofs.devbox.plural.sh{{- end -}}

{{- define "substrate.zerofs.image" -}}
{{- $i := .Values.zerofs.image -}}
{{- if $i.digest }}{{ printf "%s@%s" $i.repository $i.digest }}{{ else }}{{ printf "%s:%s" $i.repository $i.tag }}{{ end -}}
{{- end -}}

{{/*
Where homes live, as ZeroFS takes it: <scheme>://<bucket>/<prefix>, in the
bucket of objectStore.snapshotLocation (or rustfs.bucket) unless
zerofs.storageUrl says otherwise.
*/}}
{{- define "substrate.zerofs.storageUrl" -}}
{{- $z := .Values.zerofs -}}
{{- if $z.storageUrl -}}
{{- $z.storageUrl -}}
{{- else -}}
{{- $b := .Values.objectStore.backend -}}
{{- $scheme := "s3" -}}
{{- if eq $b "gcs" }}{{ $scheme = "gs" }}{{ else if eq $b "azureBlob" }}{{ $scheme = "azure" }}{{ end -}}
{{- printf "%s://%s/%s" $scheme (include "substrate.juicefs.snapshotBucket" .) (trimAll "/" $z.prefix) -}}
{{- end -}}
{{- end -}}

{{/* The Secret holding the encryption password every home is encrypted with. */}}
{{- define "substrate.zerofs.passwordSecret" -}}
{{- .Values.zerofs.encryption.existingSecret.name | default "devbox-zerofs-encryption" -}}
{{- end -}}

{{- define "substrate.zerofs.passwordKey" -}}
{{- if .Values.zerofs.encryption.existingSecret.name -}}
{{- .Values.zerofs.encryption.existingSecret.key -}}
{{- else -}}
password
{{- end -}}
{{- end -}}

{{/* SPIFFE IDs allowed to call the controller: ate-api-server creates and deletes homes, and the devbox-gateway
seeds them from their revision's golden home. */}}
{{- define "substrate.zerofs.allowedClients" -}}
{{- $out := .Values.zerofs.allowedClients -}}
{{- if not $out -}}
{{- $out = list (include "substrate.spiffeID" (list (include "substrate.namespace" .) "ate-api-server")) -}}
{{- if .Values.devboxes.enabled -}}
{{- $out = append $out (include "substrate.spiffeID" (list .Values.devboxes.gatewayNamespace "devbox-gateway")) -}}
{{- end -}}
{{- end -}}
{{- join "," $out -}}
{{- end -}}

{{/*
object_store options for every writer, as --object-store-option flags. ZeroFS
ignores client options from the environment, so plain-HTTP endpoints (RustFS
included) need allow_http here.
*/}}
{{- define "substrate.zerofs.objectStoreOptions" -}}
{{- $os := .Values.objectStore -}}
{{- $opts := dict -}}
{{- if and (eq $os.backend "s3") (or .Values.rustfs.enabled (hasPrefix "http://" ($os.s3.endpoint | default ""))) -}}
{{- $_ := set $opts "allow_http" "true" -}}
{{- end -}}
{{- $opts = mergeOverwrite $opts (.Values.zerofs.node.objectStoreOptions | default dict) -}}
{{- range $k := keys $opts | sortAlpha }}
- --object-store-option={{ $k }}={{ index $opts $k }}
{{- end -}}
{{- end -}}

{{/* The bucket's credentials and endpoint, which both plugins read from the environment. */}}
{{- define "substrate.zerofs.storageEnv" -}}
{{- $z := .Values.zerofs -}}
{{- $os := .Values.objectStore -}}
{{- if eq $os.backend "s3" }}
{{ include "substrate.objectstoreBackendEnv" . }}
{{- else if eq $os.backend "azureBlob" }}
{{- $account := regexReplaceAll "\\..*$" (urlParse $os.azureBlob.accountUrl).host "" }}
- name: AZURE_STORAGE_ACCOUNT
  value: {{ $account | quote }}
- name: AZURE_STORAGE_ACCOUNT_NAME
  value: {{ $account | quote }}
- name: AZURE_CLIENT_ID
  value: {{ $z.azureClientId | quote }}
- name: AZURE_TENANT_ID
  value: {{ $os.azureBlob.tenantId | quote }}
- name: AZURE_FEDERATED_TOKEN_FILE
  value: /var/run/secrets/azure/tokens/azure-identity-token
{{- end }}
{{- end -}}

{{/* The CSIDriverConfig ate-api-server and atelet find the driver through. */}}
{{- define "substrate.zerofs.csiDriverConfig" -}}
{{- $ns := include "substrate.namespace" . -}}
apiVersion: ate.dev/v1
kind: CSIDriverConfig
metadata:
  name: {{ include "substrate.zerofs.driverName" . }}
  labels:
    {{- include "substrate.labels" . | nindent 4 }}
spec:
  driverName: {{ include "substrate.zerofs.driverName" . }}
  controllerEndpoint: {{ printf "tcp://devbox-zerofs.%s.svc:9820" $ns }}
  tls:
    enabled: true
    usePodIdentity: true
    serverName: {{ printf "devbox-zerofs.%s.svc" $ns }}
{{- end -}}
