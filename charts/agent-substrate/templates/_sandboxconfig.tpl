{{/* The microvm SandboxConfig with its asset bucket and specOverrides applied. */}}
{{- define "substrate.microvmSandboxConfig" -}}
{{- $m := .Values.sandboxConfigs.microvm -}}
{{- $raw := .Files.Get "files/sandboxconfig/microvm.yaml" | replace "${BUCKET_SCHEME}" $m.assetScheme | replace "${ASSET_BUCKET_NAME}" $m.assetBucket -}}
{{- $obj := $raw | fromYaml -}}
{{- $_ := set $obj "spec" (mergeOverwrite $obj.spec ($m.specOverrides | default dict)) -}}
{{- toYaml $obj -}}
{{- end -}}

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
{{- $out = append $out (include "substrate.microvmSandboxConfig" . | fromYaml) -}}
{{- end -}}
{{- toYaml $out -}}
{{- end -}}
