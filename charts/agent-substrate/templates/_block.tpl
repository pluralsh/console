{{- define "substrate.block.driverName" -}}block.devbox.plural.sh{{- end -}}

{{- define "substrate.block.image" -}}
{{- $i := .Values.block.image -}}
{{- if $i.digest }}{{ printf "%s@%s" $i.repository $i.digest }}{{ else }}{{ printf "%s:%s" $i.repository $i.tag }}{{ end -}}
{{- end -}}

{{/* The partial Pod the controller merges over anchor pods' defaults. */}}
{{- define "substrate.block.anchorTemplate" -}}
{{- $a := .Values.block.anchor -}}
{{- $meta := dict "labels" (merge (dict "app.kubernetes.io/instance" .Release.Name) ($a.podLabels | default dict)) -}}
{{- with $a.podAnnotations }}{{ $_ := set $meta "annotations" . }}{{ end -}}
{{- $spec := dict "serviceAccountName" "devbox-block-anchor" -}}
{{- with $a.priorityClassName }}{{ $_ := set $spec "priorityClassName" . }}{{ end -}}
{{- if $a.hostNetwork }}{{ $_ := set $spec "hostNetwork" true }}{{ end -}}
{{- with $a.tolerations }}{{ $_ := set $spec "tolerations" . }}{{ end -}}
{{- $secrets := list -}}
{{- range .Values.image.pullSecrets -}}
{{- $secrets = append $secrets (kindIs "string" . | ternary (dict "name" .) .) -}}
{{- end -}}
{{- with $secrets }}{{ $_ := set $spec "imagePullSecrets" . }}{{ end -}}
{{- with $a.resources }}{{ $_ := set $spec "containers" (list (dict "name" "anchor" "resources" .)) }}{{ end -}}
{{- toYaml (mergeOverwrite (dict "metadata" $meta "spec" $spec) (deepCopy ($a.overrides | default dict))) -}}
{{- end -}}

{{/* SPIFFE IDs allowed to call the controller: ate-api-server creates, attaches and deletes homes. */}}
{{- define "substrate.block.allowedClients" -}}
{{- $out := .Values.block.allowedClients -}}
{{- if not $out -}}
{{- $out = list (include "substrate.spiffeID" (list (include "substrate.namespace" .) "ate-api-server")) -}}
{{- end -}}
{{- join "," $out -}}
{{- end -}}

{{/* The CSIDriverConfig ate-api-server and atelet find the driver through. */}}
{{- define "substrate.block.csiDriverConfig" -}}
{{- $ns := include "substrate.namespace" . -}}
apiVersion: ate.dev/v1
kind: CSIDriverConfig
metadata:
  name: {{ include "substrate.block.driverName" . }}
  labels:
    {{- include "substrate.labels" . | nindent 4 }}
spec:
  driverName: {{ include "substrate.block.driverName" . }}
  controllerEndpoint: {{ printf "tcp://devbox-block.%s.svc:9830" $ns }}
  tls:
    enabled: true
    usePodIdentity: true
    serverName: {{ printf "devbox-block.%s.svc" $ns }}
{{- end -}}
