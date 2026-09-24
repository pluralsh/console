{{/*
Expand the name of the ferrotunnel component, based on console.name with a -ferrotunnel suffix.
*/}}
{{- define "ferrotunnel.name" -}}
{{- printf "%s-ferrotunnel" (include "console.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified name for the ferrotunnel component.
*/}}
{{- define "ferrotunnel.fullname" -}}
{{- if .Values.ferrotunnel.fullnameOverride }}
{{- .Values.ferrotunnel.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-ferrotunnel" (include "console.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "ferrotunnel.labels" -}}
helm.sh/chart: {{ include "console.chart" . }}
{{ include "ferrotunnel.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "ferrotunnel.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ferrotunnel.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "ferrotunnel.deploymentName" -}}
{{- printf "%s-server" (include "ferrotunnel.fullname" .) }}
{{- end }}

{{- define "ferrotunnel.controlServiceName" -}}
{{- printf "%s-control" (include "ferrotunnel.fullname" .) }}
{{- end }}

{{- define "ferrotunnel.httpServiceName" -}}
{{- printf "%s-http" (include "ferrotunnel.fullname" .) }}
{{- end }}

{{- define "ferrotunnel.serviceAccountName" -}}
{{- if .Values.ferrotunnel.serviceAccount.create }}
{{- default (include "ferrotunnel.fullname" .) .Values.ferrotunnel.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.ferrotunnel.serviceAccount.name }}
{{- end }}
{{- end }}
