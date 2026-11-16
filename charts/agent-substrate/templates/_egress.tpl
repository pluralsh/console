{{/*
atenet-egress's envoy.yaml with the additional ext_proc filter and cluster
spliced in at the #ATE_MITM_EXTPROC_* markers, as ate-setup's
patchAtenetEgressManifest does.
*/}}
{{- define "substrate.egress.envoyConfig" -}}
{{- $raw := .Files.Get "files/envoy/egress.yaml" -}}
{{- $spec := (include "substrate.devboxes" . | fromJson).additionalExtprocService -}}
{{- if not $spec -}}
{{- $raw -}}
{{- else -}}
{{- $parts := splitList "/" $spec -}}
{{- $ns := index $parts 0 -}}
{{- $svcPort := splitList ":" (index $parts 1) -}}
{{- $svc := index $svcPort 0 -}}
{{- $port := index $svcPort 1 -}}
{{- $filter := include "substrate.egress.extprocFilter" (include "substrate.devboxes" . | fromJson) -}}
{{- $cluster := include "substrate.egress.extprocCluster" (dict "address" (printf "%s.%s.svc.cluster.local" $svc $ns) "port" $port "serverName" (printf "%s.%s.svc" $svc $ns)) -}}
{{- $filters := 0 -}}
{{- $clusters := 0 -}}
{{- $out := list -}}
{{- range $line := splitList "\n" $raw -}}
{{- $trimmed := trim $line -}}
{{- $indent := regexFind "^[ \t]*" $line -}}
{{- if hasPrefix "#ATE_MITM_EXTPROC_FILTER" $trimmed -}}
{{- $filters = add1 $filters -}}
{{- range $l := splitList "\n" $filter -}}
{{- $out = append $out (ternary "" (print $indent $l) (eq $l "")) -}}
{{- end -}}
{{- else if hasPrefix "#ATE_MITM_EXTPROC_CLUSTER" $trimmed -}}
{{- $clusters = add1 $clusters -}}
{{- range $l := splitList "\n" $cluster -}}
{{- $out = append $out (ternary "" (print $indent $l) (eq $l "")) -}}
{{- end -}}
{{- else -}}
{{- $out = append $out $line -}}
{{- end -}}
{{- end -}}
{{- if or (ne $filters 2) (ne $clusters 1) -}}
{{- fail (printf "files/envoy/egress.yaml: expected 2 #ATE_MITM_EXTPROC_FILTER and 1 #ATE_MITM_EXTPROC_CLUSTER markers, found %d and %d" $filters $clusters) -}}
{{- end -}}
{{- join "\n" $out -}}
{{- end -}}
{{- end -}}

{{- define "substrate.egress.extprocFilter" -}}
- name: envoy.filters.http.ext_proc
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.ext_proc.v3.ExternalProcessor
    grpc_service:
      envoy_grpc:
        cluster_name: additional_egress_ext_proc
      timeout: 2s
    failure_mode_allow: false
    message_timeout: 2s
    request_attributes:
    - filter_state['dev.ate.actor.identity']
    {{- if .additionalExtprocAllowModeOverride }}
    # Lets the processor ask for a request's response headers (mode_override).
    allow_mode_override: true
    {{- end }}
    processing_mode:
      request_header_mode: SEND
      response_header_mode: SKIP
      request_body_mode: NONE
      response_body_mode: NONE
      request_trailer_mode: SKIP
      response_trailer_mode: SKIP
    mutation_rules:
      disallow_system: true
      disallow_is_error: true
{{- end -}}

{{- define "substrate.egress.extprocCluster" -}}
- name: additional_egress_ext_proc
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  connect_timeout: 1s
  typed_extension_protocol_options:
    envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
      "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
      explicit_http_config:
        http2_protocol_options: {}
  transport_socket:
    name: envoy.transport_sockets.tls
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
      sni: {{ .serverName }}
      common_tls_context:
        tls_params:
          tls_minimum_protocol_version: TLSv1_3
          tls_maximum_protocol_version: TLSv1_3
        tls_certificate_sds_secret_configs:
        - name: podidentity_client_cert
          sds_config:
            resource_api_version: V3
            path_config_source:
              path: /etc/envoy/sds-podidentity-cert.yaml
        combined_validation_context:
          default_validation_context:
            match_typed_subject_alt_names:
            - san_type: DNS
              matcher:
                exact: {{ .serverName }}
          validation_context_sds_secret_config:
            name: servicedns_validation_context
            sds_config:
              resource_api_version: V3
              path_config_source:
                path: /etc/envoy/sds-servicedns-validation.yaml
  load_assignment:
    cluster_name: additional_egress_ext_proc
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: {{ .address }}
              port_value: {{ .port }}
{{- end -}}
