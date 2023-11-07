{{ $isGcp := or (eq .Provider "google") (eq .Provider "gcp") }}
global:
  application:
    links:
    - description: console web ui
      url: {{ .Values.console_dns }}

{{- if eq .Provider "kind" }}
replicaCount: 1
{{- end }}

ingress:
  console_dns: {{ .Values.console_dns }}
  {{- if eq .Provider "kind" }}
  annotations:
    external-dns.alpha.kubernetes.io/target: "127.0.0.1"
  {{- end }}

postgresNamespace: {{ namespace "postgres" }}
provider: {{ .Provider }}

{{- if and (eq .Provider "azure") (not .ClusterAPI) }}
podLabels:
  aadpodidbinding: console

useAADPodIdentity: true

consoleIdentityId: {{ importValue "Terraform" "console_msi_id" }}
consoleIdentityClientId: {{ importValue "Terraform" "console_msi_client_id" }}
{{- end }}

{{- if and (eq .Provider "azure") .ClusterAPI }}
podLabels:
  azure.workload.identity/use: "true"

serviceAccount:
  annotations:
    azure.workload.identity/client-id: {{ importValue "Terraform" "console_msi_client_id" }}
{{- end }}

extraEnv:
{{- if eq .Provider "aws" }}
- name: BACKUP_ACCESS_KEY
  valueFrom:
    secretKeyRef:
      name: postgres-user-auth
      key: ACCESS_KEY_ID
- name: BACKUP_SECRET_ACCESS_KEY
  valueFrom:
    secretKeyRef:
      name: postgres-user-auth
      key: SECRET_ACCESS_KEY
{{- end }}
{{- if .Configuration.loki }}
- name: LOKI_HOST
  value: http://loki-loki-distributed-gateway.{{ namespace "loki" }}
- name: GRAFANA_TENANT
  value: {{ .Cluster }}
{{- end }}
{{- if and (eq .Provider "azure") (not .ClusterAPI) }}
- name: ARM_USE_MSI
  value: 'true'
- name: ARM_SUBSCRIPTION_ID
  value: {{ .Context.SubscriptionId }}
- name: ARM_TENANT_ID
  value: {{ .Context.TenantId }}
{{- end }}
{{- if and (eq .Provider "azure") .ClusterAPI }}
- name: ARM_USE_OIDC
  value: 'true'
- name: ARM_OIDC_TOKEN_FILE_PATH # Same as AZURE_FEDERATED_TOKEN_FILE that gets injected by AZWI
  value: /var/run/secrets/azure/tokens/azure-identity-token
{{- end }}

{{- if or (eq .Provider "aws") $isGcp }}
serviceAccount:
  {{- if $isGcp }}
  create: false
  {{- end }}
  {{- if eq .Provider "aws" }}
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::{{ .Project }}:role/{{ .Cluster }}-console
  {{- end }}
{{- end }}

secrets:
  jwt: {{ dedupe . "console.secrets.jwt" (randAlphaNum 20) }}
  admin_name: {{ .Values.admin_name }}
  aes_key: {{ dedupe . "console.secrets.aes_key" genAESKey }}
  admin_email: {{ dedupe . "console.secrets.admin_email" (default "someone@example.com" .Config.Email) }}
  admin_password: {{ dedupe . "console.secrets.admin_password" (randAlphaNum 20) }}
{{- if .Values.console_dns  }}
  git_url: {{ ternary .Values.repo_url repoUrl (hasKey .Values "repo_url") | quote }}
  repo_root: {{ repoName }}
  branch_name: {{ branchName }}
  config: {{ toYaml .Config | nindent 4 }}
{{ $identity := pathJoin repoRoot ".plural-crypt" "identity" }}
{{- if fileExists $identity }}
  identity: {{ readFile $identity | quote }}
{{- else if ne (dig "console" "secrets" "identity" "default" .) "default" }}
  identity: {{ .console.secrets.identity | quote }}
{{- end }}
  key: {{ dedupe . "console.secrets.key" (readFile (homeDir ".plural" "key")) | quote }}
{{- else }}
  git_url: ''
  repo_root: ''
  branch_name: ''
  config: ''
  key: ''
{{- end }}
  cluster_name: {{ .Cluster }}
  erlang: {{ dedupe . "console.secrets.erlang" (randAlphaNum 14) }}
  id_rsa: {{ ternary .Values.private_key (dedupe . "console.secrets.id_rsa" "") (hasKey .Values "private_key") | quote }}
  id_rsa_pub: {{ ternary .Values.public_key (dedupe . "console.secrets.id_rsa_pub" "") (hasKey .Values "public_key") | quote }}
  ssh_passphrase: {{ ternary .Values.passphrase (dedupe . "console.secrets.ssh_passphrase" "") (hasKey .Values "passphrase") | quote }}
  git_access_token: {{ ternary .Values.access_token (dedupe . "console.secrets.git_access_token" "") (hasKey .Values "access_token") | quote }}
  git_user: {{ default "console" .Values.git_user }}
  git_email: {{ default "console@plural.sh" .Values.git_email }}
{{- if .OIDC }}
  plural_client_id: {{ .OIDC.ClientId }}
  plural_client_secret: {{ .OIDC.ClientSecret }}
{{- end }}
{{- if .Values.is_demo }}
  is_demo: {{ .Values.is_demo }}
{{- end }}

license: {{ .License | quote }}

{{- if .Values.testBase.enabled }}
test-base:
  enabled: true
  secret:
    CYPRESS_EMAIL: {{ .Values.testBase.cypressEmail }}
    CYPRESS_PASSWORD: {{ .Values.testBase.cypressPassword }}
    CYPRESS_BASE_URL: https://{{ .Values.console_dns }}/
{{- end }}
