# test/tpl/_templateWithInclude.tpl
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Configuration.name }}-main
data:
  included:
{{ include "more-data" . | indent 4 }}

{{- define "more-data" -}}
version: {{ .Configuration.version | quote }}
more-data: {{ .Configuration.name }}-included
{{- end }}
