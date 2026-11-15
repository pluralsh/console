{{/* The SandboxConfig objects this release installs, as a YAML list. */}}
{{- define "substrate.sandboxConfigs" -}}
{{- $out := list -}}
{{- $g := .Values.sandboxConfigs.gvisor -}}
{{- if $g.enabled -}}
{{- $obj := .Files.Get "files/sandboxconfig/gvisor.yaml" | fromYaml -}}
{{- $_ := set $obj "spec" (mergeOverwrite $obj.spec ($g.specOverrides | default dict)) -}}
{{- $out = append $out $obj -}}
{{- end -}}
{{- $m := .Values.sandboxConfigs.microvm -}}
{{- if $m.enabled -}}
{{- $raw := .Files.Get "files/sandboxconfig/microvm.yaml" | replace "${BUCKET_SCHEME}" $m.assetScheme | replace "${ASSET_BUCKET_NAME}" $m.assetBucket -}}
{{- $obj := $raw | fromYaml -}}
{{- $_ := set $obj "spec" (mergeOverwrite $obj.spec ($m.specOverrides | default dict)) -}}
{{- $out = append $out $obj -}}
{{- end -}}
{{- toYaml $out -}}
{{- end -}}
