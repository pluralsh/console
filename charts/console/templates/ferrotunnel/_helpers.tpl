{{/*
Expand the name of the tunnel component, based on console.name with a -tunnel suffix.
*/}}
{{- define "ferrotunnel.name" -}}
{{- printf "%s-tunnel" (include "console.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified name for the tunnel component.
*/}}
{{- define "ferrotunnel.fullname" -}}
{{- if .Values.ferrotunnel.fullnameOverride }}
{{- .Values.ferrotunnel.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-tunnel" (include "console.fullname" .) | trunc 63 | trimSuffix "-" }}
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

{{/*
Default public hostname: tunnel.<domain>, stripping the first label of console DNS
so it stays under wildcard certs (console.example.com -> tunnel.example.com).
*/}}
{{- define "ferrotunnel.host" -}}
{{- if .Values.ferrotunnel.host }}
{{- .Values.ferrotunnel.host }}
{{- else }}
{{- $parts := splitList "." (.Values.ingress.console_dns | default "") }}
{{- if gt (len $parts) 1 }}
{{- printf "tunnel.%s" (rest $parts | join ".") }}
{{- end }}
{{- end }}
{{- end }}

{{- define "ferrotunnel.serviceAccountName" -}}
{{- if .Values.ferrotunnel.serviceAccount.create }}
{{- default (include "ferrotunnel.fullname" .) .Values.ferrotunnel.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.ferrotunnel.serviceAccount.name }}
{{- end }}
{{- end }}
