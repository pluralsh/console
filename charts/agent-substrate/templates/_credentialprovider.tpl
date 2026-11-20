{{/*
Presets for atelet's kubelet CredentialProviderConfig: the provider each cloud
ships on its nodes, where the binary lives and what the kubelet config there
says. The binaries authenticate as atelet's pod.
*/}}
{{- define "substrate.icp.presets" -}}
ecr:
  binDir: /etc/eks/image-credential-provider
  extraHostPaths: []
  provider:
    name: ecr-credential-provider
    apiVersion: credentialprovider.kubelet.k8s.io/v1
    defaultCacheDuration: 12h
    matchImages:
      - "*.dkr.ecr.*.amazonaws.com"
      - "*.dkr-ecr.*.on.aws"
      - "*.dkr.ecr.*.amazonaws.com.cn"
      - "*.dkr-ecr.*.on.amazonwebservices.com.cn"
      - "*.dkr.ecr-fips.*.amazonaws.com"
gar:
  binDir: /home/kubernetes/bin
  extraHostPaths: []
  provider:
    name: auth-provider-gcp
    apiVersion: credentialprovider.kubelet.k8s.io/v1
    defaultCacheDuration: 1m
    args:
      - get-credentials
      - --v=3
    matchImages:
      - container.cloud.google.com
      - gcr.io
      - "*.gcr.io"
      - "*.pkg.dev"
acr:
  binDir: /var/lib/kubelet/credential-provider
  extraHostPaths:
    - name: azure-json
      path: /etc/kubernetes/azure.json
      type: File
  provider:
    name: acr-credential-provider
    apiVersion: credentialprovider.kubelet.k8s.io/v1
    defaultCacheDuration: 10m
    args:
      - /etc/kubernetes/azure.json
    matchImages:
      - "*.azurecr.io"
      - "*.azurecr.cn"
      - "*.azurecr.de"
      - "*.azurecr.us"
{{- end -}}

{{/* Resolved settings: {binDir, extraHostPaths, providers}. */}}
{{- define "substrate.icp.resolved" -}}
{{- $icp := .Values.atelet.imageCredentialProvider -}}
{{- $out := dict "binDir" $icp.binDir "extraHostPaths" ($icp.extraHostPaths | default list) "providers" ($icp.providers | default list) -}}
{{- if ne $icp.preset "custom" -}}
{{- $presets := include "substrate.icp.presets" . | fromYaml -}}
{{- if not (hasKey $presets $icp.preset) -}}
{{- fail (printf "atelet.imageCredentialProvider.preset must be ecr, gar, acr or custom, got %q" $icp.preset) -}}
{{- end -}}
{{- $preset := index $presets $icp.preset -}}
{{- $p := deepCopy $preset.provider -}}
{{- with $icp.matchImages }}{{ $_ := set $p "matchImages" . }}{{ end -}}
{{- with $icp.args }}{{ $_ := set $p "args" . }}{{ end -}}
{{- with $icp.env }}{{ $_ := set $p "env" . }}{{ end -}}
{{- with $icp.defaultCacheDuration }}{{ $_ := set $p "defaultCacheDuration" . }}{{ end -}}
{{- $_ := set $out "providers" (list $p) -}}
{{- $_ := set $out "binDir" ($icp.binDir | default $preset.binDir) -}}
{{- $_ := set $out "extraHostPaths" (concat $preset.extraHostPaths ($icp.extraHostPaths | default list)) -}}
{{- end -}}
{{- toYaml $out -}}
{{- end -}}

{{- define "substrate.icp.config" -}}
apiVersion: kubelet.config.k8s.io/v1
kind: CredentialProviderConfig
providers:
  {{- toYaml (include "substrate.icp.resolved" . | fromYaml).providers | nindent 2 }}
{{- end -}}
