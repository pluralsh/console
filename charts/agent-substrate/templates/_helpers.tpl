{{/* vim: set filetype=mustache: */}}

{{- define "substrate.namespace" -}}
{{- .Release.Namespace -}}
{{- end -}}

{{- define "substrate.podcertNamespace" -}}
{{- .Values.podCertificateController.namespace -}}
{{- end -}}

{{- define "substrate.version" -}}
{{- .Values.substrateVersion | default .Chart.AppVersion -}}
{{- end -}}

{{- define "substrate.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Labels on every object. Selectors keep upstream's bare `app` label. */}}
{{- define "substrate.labels" -}}
helm.sh/chart: {{ include "substrate.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/part-of: agent-substrate
app.kubernetes.io/version: {{ include "substrate.version" . | quote }}
{{- end -}}

{{/*
Image reference. Call with (dict "ctx" $ "key" "ateapi" "name" "ateapi").
*/}}
{{- define "substrate.image" -}}
{{- $ctx := .ctx -}}
{{- $o := index $ctx.Values.images .key | default dict -}}
{{- $repo := $o.repository | default (printf "%s/%s" $ctx.Values.image.registry .name) -}}
{{- if $o.digest -}}
{{- printf "%s@%s" $repo $o.digest -}}
{{- else -}}
{{- printf "%s:%s" $repo ($o.tag | default $ctx.Values.image.tag | default (include "substrate.version" $ctx)) -}}
{{- end -}}
{{- end -}}

{{- define "substrate.imagePullSecrets" -}}
{{- with .Values.image.pullSecrets }}
imagePullSecrets:
{{- range . }}
{{- if kindIs "string" . }}
  - name: {{ . }}
{{- else }}
  - {{ toYaml . | nindent 4 | trim }}
{{- end }}
{{- end }}
{{- end }}
{{- end -}}

{{/*
--preview, as ate-setup injects it into every Substrate container, with the
gates the chart's own features need.
*/}}
{{- define "substrate.previewArg" -}}
{{- $gates := .Values.previewGates | default list -}}
{{- if and (or .Values.juicefs.enabled .Values.zerofs.enabled) (not (has "ALL" $gates)) -}}
{{- $gates = append $gates "ExternalVolumes" -}}
{{- end -}}
{{- printf "--preview=%s" (join "," (uniq $gates)) -}}
{{- end -}}

{{/* Log level of a component: (list $ .Values.atelet.logLevel). */}}
{{- define "substrate.logLevel" -}}
{{- $ctx := index . 0 -}}
{{- index . 1 | default $ctx.Values.logLevel -}}
{{- end -}}

{{- define "substrate.spiffeID" -}}
{{- printf "spiffe://cluster.local/ns/%s/sa/%s" (index . 0) (index . 1) -}}
{{- end -}}

{{- define "substrate.actorJWTIssuer" -}}
{{- .Values.auth.actorJWTIssuer | default (printf "https://idp.%s.svc" (include "substrate.namespace" .)) -}}
{{- end -}}

{{/*
auth.bootstrapOwners (default: the ate-client ServiceAccount), plus the
deployment-operator's ServiceAccount with devboxes.enabled.
*/}}
{{- define "substrate.bootstrapOwners" -}}
{{- $owners := .Values.auth.bootstrapOwners | default (list (printf "system:serviceaccount:%s:ate-client" (include "substrate.namespace" .))) -}}
{{- if and .Values.devboxes.enabled .Values.devboxes.operatorServiceAccount -}}
{{- $owners = append $owners (printf "system:serviceaccount:%s" (replace "/" ":" .Values.devboxes.operatorServiceAccount)) -}}
{{- end -}}
{{- join "," (uniq $owners) -}}
{{- end -}}

{{/* "true" when the installed Substrate serves substrate.objectstore.v1. */}}
{{- define "substrate.objectstoreV1" -}}
{{- $o := toString .Values.objectstoreV1Support -}}
{{- if eq $o "true" -}}true
{{- else if eq $o "false" -}}false
{{- else -}}
{{- $v := include "substrate.version" . -}}
{{- if regexMatch "^v?[0-9]+\\.[0-9]+\\.[0-9]+" $v -}}
{{- if semverCompare ">=1.0.0-0" $v -}}true{{- else -}}false{{- end -}}
{{- else -}}false
{{- end -}}
{{- end -}}
{{- end -}}

{{/* "true" when rustfs supplies the S3 store. */}}
{{- define "substrate.rustfs" -}}
{{- if .Values.rustfs.enabled -}}true{{- end -}}
{{- end -}}

{{- define "substrate.snapshotLocation" -}}
{{- if .Values.objectStore.snapshotLocation -}}
{{- .Values.objectStore.snapshotLocation -}}
{{- else if .Values.rustfs.enabled -}}
{{- printf "s3://%s/" .Values.rustfs.bucket -}}
{{- end -}}
{{- end -}}

{{/*
The install settings the deployment-operator's devbox gateway needs (its
checkSubstrateInstall), as JSON. With devboxes.enabled each one defaults to
the gateway's; an explicitly set value wins over the preset. credentialProviders
counts as set once it differs from the chart default [{name: k8s.io}], and
additionalExtprocAllowModeOverride once it's a boolean.
*/}}
{{- define "substrate.devboxes" -}}
{{- $d := .Values.devboxes -}}
{{- $r := .Values.atenet.router -}}
{{- $e := .Values.atenet.egress -}}
{{- $out := dict
  "credentialProviders" $e.credentialProviders
  "additionalExtprocService" ($e.additionalExtprocService | default "")
  "additionalExtprocAllowModeOverride" (ternary $e.additionalExtprocAllowModeOverride (and $d.enabled true) (kindIs "bool" $e.additionalExtprocAllowModeOverride))
  "routeTimeout" ($r.routeTimeout | default "")
  "ingressAllowedSPIFFEIDs" ($r.ingressAllowedSPIFFEIDs | default list)
  "egressGatewayExtraSPIFFEIDs" (.Values.auth.egressGatewayExtraSPIFFEIDs | default list) -}}
{{- if $d.enabled -}}
{{- $gw := $d.gatewayNamespace -}}
{{- $spiffe := include "substrate.spiffeID" (list $gw "devbox-gateway") -}}
{{- if eq (toJson $e.credentialProviders) (toJson (list (dict "name" "k8s.io"))) -}}
{{- $_ := set $out "credentialProviders" (list (dict "name" "k8s.io") (dict "name" "plural.sh" "address" (printf "devbox-gateway.%s.svc:50052" $gw))) -}}
{{- end -}}
{{- if not $out.additionalExtprocService -}}
{{- $_ := set $out "additionalExtprocService" (printf "%s/devbox-egress-authz:50053" $gw) -}}
{{- end -}}
{{- if not $out.routeTimeout -}}
{{- $_ := set $out "routeTimeout" $d.routeTimeout -}}
{{- end -}}
{{- if not $out.ingressAllowedSPIFFEIDs -}}
{{- $_ := set $out "ingressAllowedSPIFFEIDs" (list $spiffe) -}}
{{- end -}}
{{- if not $out.egressGatewayExtraSPIFFEIDs -}}
{{- $_ := set $out "egressGatewayExtraSPIFFEIDs" (list $spiffe) -}}
{{- end -}}
{{- end -}}
{{- toJson $out -}}
{{- end -}}

{{/*
Egress credential providers as JSON, with the bundled provider's address
filled in and server names derived as ate-setup does.
*/}}
{{- define "substrate.credentialProviders" -}}
{{- $ns := include "substrate.namespace" . -}}
{{- $out := list -}}
{{- range (include "substrate.devboxes" . | fromJson).credentialProviders -}}
{{- $addr := .address | default "" -}}
{{- if and (eq .name "k8s.io") (not $addr) -}}
{{- $addr = printf "k8s-credential-provider.%s.svc:50051" $ns -}}
{{- end -}}
{{- $host := regexReplaceAll ":[^:]*$" $addr "" -}}
{{- $out = append $out (dict "name" .name "address" $addr "serverName" ($host)) -}}
{{- end -}}
{{- toJson $out -}}
{{- end -}}

{{- define "substrate.k8sCredentialProviderEnabled" -}}
{{- range (include "substrate.devboxes" . | fromJson).credentialProviders -}}
{{- if eq .name "k8s.io" -}}true{{- end -}}
{{- end -}}
{{- end -}}

{{/* Scheduling for the system-infra Deployments. */}}
{{- define "substrate.systemInfraPodLabels" -}}
{{- if .Values.systemInfra.cordon }}
ate.dev/workloadType: ate-system-infra
{{- end }}
{{- end -}}

{{- define "substrate.systemInfraScheduling" -}}
{{- $s := .Values.systemInfra -}}
{{- $nodeSelector := deepCopy ($s.nodeSelector | default dict) -}}
{{- $tolerations := $s.tolerations | default list -}}
{{- $spread := $s.topologySpreadConstraints | default list -}}
{{- if $s.cordon -}}
{{- $_ := set $nodeSelector "ate.dev/workloadType" "ate-system-infra" -}}
{{- $tolerations = append $tolerations (dict "key" "ate.dev/workloadType" "operator" "Equal" "value" "ate-system-infra" "effect" "NoSchedule") -}}
{{- if not $spread -}}
{{- $spread = list (dict "maxSkew" 1 "topologyKey" "kubernetes.io/hostname" "whenUnsatisfiable" "ScheduleAnyway" "labelSelector" (dict "matchLabels" (dict "ate.dev/workloadType" "ate-system-infra")) "matchLabelKeys" (list "app")) -}}
{{- end -}}
{{- end -}}
{{- with $nodeSelector }}
nodeSelector:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with $tolerations }}
tolerations:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with $s.affinity }}
affinity:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with $spread }}
topologySpreadConstraints:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end -}}

{{/* Standard downward-API env most Substrate containers carry. */}}
{{- define "substrate.podEnv" -}}
- name: POD_NAME
  valueFrom:
    fieldRef:
      fieldPath: metadata.name
- name: POD_NAMESPACE
  valueFrom:
    fieldRef:
      fieldPath: metadata.namespace
- name: POD_UID
  valueFrom:
    fieldRef:
      fieldPath: metadata.uid
- name: OTEL_RESOURCE_ATTRIBUTES
  value: k8s.namespace.name=$(POD_NAMESPACE),k8s.pod.name=$(POD_NAME),k8s.pod.uid=$(POD_UID),service.instance.id=$(POD_UID)
{{- end -}}

{{/* Projected podCertificate (+ optional trust bundle) volume source. */}}
{{- define "substrate.podCertVolume" -}}
{{- $signer := printf "%s.podcert.ate.dev/identity" .signer -}}
- name: {{ .name | quote }}
  projected:
    sources:
      {{- if not .caOnly }}
      - podCertificate:
          signerName: {{ $signer }}
          keyType: ECDSAP256
          credentialBundlePath: credential-bundle.pem
      {{- end }}
      {{- if or .ca .caOnly }}
      - clusterTrustBundle:
          signerName: {{ $signer }}
          labelSelector:
            matchLabels:
              podcert.ate.dev/canarying: live
          path: trust-bundle.pem
      {{- end }}
{{- end -}}

{{/* Checksum of another template, for rollout annotations. */}}
{{- define "substrate.checksum" -}}
{{- $ctx := index . 0 -}}
{{- include (print $ctx.Template.BasePath "/" (index . 1)) $ctx | sha256sum -}}
{{- end -}}

{{/* Ownership metadata that lets Helm adopt an object created out of band. */}}
{{- define "substrate.adoptionMetadata" -}}
labels:
  app.kubernetes.io/managed-by: Helm
annotations:
  meta.helm.sh/release-name: {{ .Release.Name }}
  meta.helm.sh/release-namespace: {{ .Release.Namespace }}
{{- end -}}

{{- define "substrate.cnpgCRDServed" -}}
{{- if .Capabilities.APIVersions.Has "postgresql.cnpg.io/v1/Cluster" -}}true{{- end -}}
{{- end -}}

{{- define "substrate.sandboxConfigCRDServed" -}}
{{- if .Capabilities.APIVersions.Has "ate.dev/v1/SandboxConfig" -}}true{{- end -}}
{{- end -}}
