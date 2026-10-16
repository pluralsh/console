
ingress:
  console_dns: {{ .Values.consoleDns }}
  kas_dns: {{ .Values.kasDns }}
  {{ if .Values.clusterIssuer }}
  annotations:
    cert-manager.io/cluster-issuer: {{ .Values.clusterIssuer }}
  {{ end }}

{{ if .Values.provider }}
provider: {{ .Values.provider }}
{{ end }}

secrets:
  jwt: {{ .Values.jwt }}
  admin_name: {{ .Values.adminName }}
  aes_key: {{ .Values.aesKey }}
  erlang: {{ .Values.erlang }}
  admin_email: {{ .Values.adminEmail }}
  admin_password: {{ .Values.adminPassword }}
  cluster_name: {{ .Values.clusterName }}
  git_url: {{ repoUrl }}
  {{ if .Values.pluralClientId }}
  plural_client_id: {{ .Values.pluralClientId }}
  {{ end }}
  {{ if .Values.pluralClientSecret }}
  plural_client_secret: {{ .Values.pluralClientSecret }}
  {{ end }}
  {{ if .Values.key }}
  key: {{ .Values.key | quote }}
  {{ end }}
  {{ if .Values.identity }}
  identity: {{ .Values.identity | quote }}
  {{ end }}

extraSecretEnv:
  PLURAL_TOKEN: {{ .Values.pluralToken }}
  KAS_API_SECRET: {{ .Values.kasApi }}
  KAS_PRIVATE_API_SECRET: {{ .Values.kasPrivateApi }}
  KAS_REDIS_SECRET: {{ .Values.kasRedis }}
  POSTGRES_URL: {{ .Values.postgresUrl }}
  CONSOLE_BYOK: 'true'

kas:
  enabled: true
  consoleUrl: {{ .Values.consoleDns }}

  secrets:
    api: {{ .Values.kasApi }}
    privateapi: {{ .Values.kasPrivateApi }}
    redis: {{ .Values.kasRedis }}

  ingress:
    kas_dns: {{ .Values.kasDns }}
    {{ if .Values.clusterIssuer }}
    annotations:
      cert-manager.io/cluster-issuer: {{ .Values.clusterIssuer }}
    {{ end }}

  redis:
    auth:
      password: {{ .Values.kasRedis }}

ferrotunnel:
  enabled: true
  host: ferrotunnel.{{ .Values.consoleDns }}
  {{ if eq .Values.provider "aws" }}
  # Internet-facing NLB for agent control (7835) and HTTP ingress (80).
  # Do not set aws-load-balancer-proxy-protocol; it breaks the TLS handshake on 7835.
  service:
    annotations:
      service.beta.kubernetes.io/aws-load-balancer-type: external
      service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
      service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ip
  {{ end }}

