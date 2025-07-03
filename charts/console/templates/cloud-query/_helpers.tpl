{{- define "console.cloudquery.db.secret" -}}
{{ include "console.fullname" . }}-cloud-query-db-password
{{- end -}}