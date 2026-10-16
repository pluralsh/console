{{/*
The workbench filesystem is only installed alongside an object store.
*/}}
{{- define "pseudofs.enabled" -}}
{{- $store := .Values.console.config.objectStore -}}
{{- if and .Values.pseudofs.enabled (or $store.s3.bucket $store.azure.storageAccount) -}}
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
{{- if $store.s3.bucket -}}
{{- $s3 := .Values.pseudofs.objectStore.s3 -}}
type: Aws
bucket: {{ $store.s3.bucket | quote }}
region: {{ $store.s3.region | default "us-east-1" | quote }}
{{- with $store.s3.endpoint }}
endpoint: {{ ternary . (printf "https://%s" .) (contains "://" .) | quote }}
{{- end }}
allow_http: {{ or $s3.allowHttp (hasPrefix "http://" ($store.s3.endpoint | default "")) }}
virtual_hosted_style: {{ $s3.virtualHostedStyle }}
{{- else -}}
{{- $azure := .Values.pseudofs.objectStore.azure -}}
type: Azure
account: {{ $store.azure.storageAccount | quote }}
container: {{ required "console.config.objectStore.azure.container is required for the workbench filesystem" $store.azure.container | quote }}
{{- with $azure.endpoint }}
endpoint: {{ . | quote }}
{{- end }}
allow_http: {{ $azure.allowHttp }}
{{- end -}}
{{- end -}}
