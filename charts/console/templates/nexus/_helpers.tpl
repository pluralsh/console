{{/*
Nexus component selector labels.
*/}}
{{- define "nexus.selectorLabels" -}}
app.kubernetes.io/name: nexus
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Nexus component labels.
*/}}
{{- define "nexus.labels" -}}
helm.sh/chart: {{ include "console.chart" . }}
{{ include "nexus.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}
