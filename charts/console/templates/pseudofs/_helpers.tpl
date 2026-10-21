{{/*
The workbench filesystem is only installed alongside an object store.
*/}}
{{/*
Explicit provider wins. Empty prefers s3, then azure, then gcs, matching the historical pseudofs choice.
*/}}
{{- define "objectStore.provider" -}}
{{- $store := .Values.console.config.objectStore -}}
{{- if $store.provider -}}
{{- if not (or (eq $store.provider "s3") (or (eq $store.provider "gcs") (eq $store.provider "azure"))) -}}
{{- fail (printf "console.config.objectStore.provider must be s3, gcs, or azure, got %q" $store.provider) -}}
{{- end -}}
{{- $store.provider -}}
{{- else if $store.s3.bucket -}}
s3
{{- else if $store.azure.storageAccount -}}
azure
{{- else if $store.gcs.bucket -}}
gcs
{{- end -}}
{{- end -}}

{{- define "pseudofs.enabled" -}}
{{- $provider := include "objectStore.provider" . | trim -}}
{{- $store := .Values.console.config.objectStore -}}
{{- if and .Values.pseudofs.enabled (eq $provider "s3") $store.s3.bucket -}}
true
{{- else if and .Values.pseudofs.enabled (eq $provider "azure") $store.azure.storageAccount -}}
true
{{- else if and .Values.pseudofs.enabled (eq $provider "gcs") $store.gcs.bucket -}}
true
{{- end -}}
{{- end -}}

{{/*
A JSON key is mounted for PseudoFS only when GCS is the selected backend and credentials are set.
*/}}
{{- define "pseudofs.gcsKey" -}}
{{- $store := .Values.console.config.objectStore -}}
{{- if and (eq (include "objectStore.provider" . | trim) "gcs") $store.gcs.credentials -}}
true
{{- end -}}
{{- end -}}

{{- define "pseudofs.fullname" -}}
console-pseudofs
{{- end -}}

{{- define "pseudofs.selectorLabels" -}}
app.kubernetes.io/name: pseudofs
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "pseudofs.labels" -}}
helm.sh/chart: {{ include "console.chart" . }}
{{ include "pseudofs.selectorLabels" . }}
app.kubernetes.io/version: {{ include "pseudofs.tag" . | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
The fs image is vendored under the console's own tags, so it follows the console image unless pinned.
*/}}
{{- define "pseudofs.tag" -}}
{{- .Values.pseudofs.image.tag | default .Values.image.tag | default .Chart.AppVersion | toString -}}
{{- end -}}

{{- define "pseudofs.image" -}}
{{- printf "%s/%s:%s" (.Values.pseudofs.image.registry | default .Values.global.registry) .Values.pseudofs.image.repository (include "pseudofs.tag" .) -}}
{{- end -}}

{{- define "pseudofs.address" -}}
{{- printf "%s.%s:%v" (include "pseudofs.fullname" .) .Release.Namespace .Values.pseudofs.service.port -}}
{{- end -}}

{{/*
The filesystem root within the object store, matching the console's default object store path of "plrl".
*/}}
{{- define "pseudofs.storagePath" -}}
{{- $base := .Values.console.config.objectStore.path | default "plrl" | trimAll "/" -}}
{{- $sub := .Values.pseudofs.objectStore.subpath | default "fs" | trimAll "/" -}}
{{- printf "%s/%s" $base $sub -}}
{{- end -}}

{{/*
Translates console.config.objectStore into a pseudofs object_store block.
*/}}
{{- define "pseudofs.objectStore" -}}
{{- $store := .Values.console.config.objectStore -}}
{{- $provider := include "objectStore.provider" . | trim -}}
{{- if eq $provider "s3" -}}
{{- $s3 := .Values.pseudofs.objectStore.s3 -}}
type: Aws
bucket: {{ required "console.config.objectStore.s3.bucket is required for the workbench filesystem" $store.s3.bucket | quote }}
region: {{ $store.s3.region | default "us-east-1" | quote }}
{{- with $store.s3.endpoint }}
endpoint: {{ ternary . (printf "https://%s" .) (contains "://" .) | quote }}
{{- end }}
allow_http: {{ or $s3.allowHttp (hasPrefix "http://" ($store.s3.endpoint | default "")) }}
virtual_hosted_style: {{ $s3.virtualHostedStyle }}
{{- else if eq $provider "gcs" -}}
type: Google
bucket: {{ required "console.config.objectStore.gcs.bucket is required for the workbench filesystem" $store.gcs.bucket | quote }}
{{- else if eq $provider "azure" -}}
{{- $azure := .Values.pseudofs.objectStore.azure -}}
type: Azure
account: {{ $store.azure.storageAccount | quote }}
container: {{ required "console.config.objectStore.azure.container is required for the workbench filesystem" $store.azure.container | quote }}
{{- with $azure.endpoint }}
endpoint: {{ . | quote }}
{{- end }}
allow_http: {{ $azure.allowHttp }}
{{- else -}}
{{- fail "the workbench filesystem requires console.config.objectStore.provider to be s3, gcs, or azure" -}}
{{- end -}}
{{- end -}}
