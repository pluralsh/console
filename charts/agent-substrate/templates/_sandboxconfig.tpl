{{/*
Where the microvm assets live, as JSON: scheme and bucket (defaulting to the
objectStore backend's scheme and the snapshot location's bucket or container),
the URL the SandboxConfig names them under (base), and the gocloud.dev URL the
staging Job writes them through (stagingUrl). The node plugin serves only its
backend's assets, and the Azure one only as the blob's https URL in its account.
*/}}
{{- define "substrate.microvmAssets" -}}
{{- $m := .Values.sandboxConfigs.microvm -}}
{{- $os := .Values.objectStore -}}
{{- $scheme := $m.assetScheme | default (get (dict "s3" "s3" "gcs" "gs" "azureBlob" "azblob") $os.backend) -}}
{{- $loc := include "substrate.snapshotLocation" . -}}
{{- $bucket := $m.assetBucket | default (regexReplaceAll "^[a-z0-9]+://([^/?]*).*$" $loc "${1}") -}}
{{- $base := printf "%s://%s" $scheme $bucket -}}
{{- $staging := $base -}}
{{- if eq $scheme "azblob" -}}
{{- $host := trimPrefix "https://" ($os.azureBlob.accountUrl | default "") | trimSuffix "/" -}}
{{- $base = printf "https://%s/%s" $host $bucket -}}
{{- $account := regexReplaceAll "\\..*$" $host "" -}}
{{- $domain := regexReplaceAll "^[^.]*\\.?" $host "" -}}
{{- $staging = printf "azblob://%s?storage_account=%s" $bucket $account -}}
{{- if and $domain (ne $domain "blob.core.windows.net") -}}
{{- $staging = printf "%s&domain=%s" $staging $domain -}}
{{- end -}}
{{- else if and (eq $scheme "s3") (or $os.s3.usePathStyle .Values.rustfs.enabled) -}}
{{- $staging = printf "%s?use_path_style=true" $base -}}
{{- end -}}
{{- dict "scheme" $scheme "bucket" $bucket "base" $base "stagingUrl" (.Values.assetStaging.bucketUrl | default $staging) | toJson -}}
{{- end -}}

{{/* The microvm SandboxConfig with its asset location and specOverrides applied. */}}
{{- define "substrate.microvmSandboxConfig" -}}
{{- $m := .Values.sandboxConfigs.microvm -}}
{{- $assets := include "substrate.microvmAssets" . | fromJson -}}
{{- $raw := .Files.Get "files/sandboxconfig/microvm.yaml" | replace "${BUCKET_SCHEME}://${ASSET_BUCKET_NAME}" $assets.base -}}
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
