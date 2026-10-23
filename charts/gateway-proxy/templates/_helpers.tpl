{{/*
Expand the name of the chart.
*/}}
{{- define "gateway-proxy.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "gateway-proxy.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "gateway-proxy.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "gateway-proxy.labels" -}}
helm.sh/chart: {{ include "gateway-proxy.chart" . }}
{{ include "gateway-proxy.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "gateway-proxy.selectorLabels" -}}
app.kubernetes.io/name: {{ include "gateway-proxy.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "gateway-proxy.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "gateway-proxy.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Name of the Secret holding PROXY_API_KEY and OAUTH_CLIENT_SECRET
*/}}
{{- define "gateway-proxy.secretName" -}}
{{- default (printf "%s-env" (include "gateway-proxy.fullname" .)) .Values.secrets.existingSecret }}
{{- end }}

{{/*
GATEWAY_MODEL_MAP value, rendered as anthropic-model=gateway-model pairs
*/}}
{{- define "gateway-proxy.modelMap" -}}
{{- $pairs := list }}
{{- range $from, $to := .Values.config.modelMap }}
{{- $pairs = append $pairs (printf "%s=%s" $from $to) }}
{{- end }}
{{- join "," $pairs }}
{{- end }}
