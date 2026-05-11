apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Configuration.name }}-configmap
  labels:
    foo: "true"
data:
  myvalue: "Hello World"
  {{- range $key, $val := .Configuration }}
  {{ $key }}: {{ $val | quote }}
  {{- end }}
