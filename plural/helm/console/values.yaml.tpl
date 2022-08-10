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

provider: {{ .Provider }}

{{ if eq .Provider "azure" }}
podLabels:
  aadpodidbinding: console

consoleIdentityId: {{ importValue "Terraform" "console_msi_id" }}
consoleIdentityClientId: {{ importValue "Terraform" "console_msi_client_id" }}

extraEnv:
- name: ARM_USE_MSI
  value: 'true'
- name: ARM_SUBSCRIPTION_ID
  value: {{ .Context.SubscriptionId }}
- name: ARM_TENANT_ID
  value: {{ .Context.TenantId }}
{{ end }}

serviceAccount:
{{ if eq .Provider "google" }}
  create: false
{{ end }}
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::{{ .Project }}:role/{{ .Cluster }}-console

secrets:
  jwt: {{ dedupe . "console.secrets.jwt" (randAlphaNum 20) }}
  admin_name: {{ .Values.admin_name }}
  admin_email: {{ dedupe . "console.secrets.admin_email" (default "someone@example.com" .Config.Email) }}
  admin_password: {{ dedupe . "console.secrets.admin_password" (randAlphaNum 20) }}
{{ if .Values.console_dns  }}
{{ $gitUrl := dig "console" "secrets" "git_url" "default" .}}
{{ if or (eq $gitUrl "default") (not $gitUrl) }}
  git_url: {{ repoUrl }}
{{ else }}
  git_url: {{ $gitUrl }}
{{ end }}
  repo_root: {{ repoName }}
  branch_name: {{ branchName }}
  config: {{ readFile (homeDir ".plural" "config.yml") | quote }}
{{ $identity := pathJoin repoRoot ".plural-crypt" "identity" }}
{{ if fileExists $identity }}
  identity: {{ readFile $identity | quote }}
{{ else if ne (dig "console" "secrets" "identity" "default" .) "default" }}
  identity: {{ .console.secrets.identity | quote }}
{{ else }}
  key: {{ readFile (homeDir ".plural" "key") | quote }}
{{ end }}
{{ else }}
  git_url: ''
  repo_root: ''
  branch_name: ''
  config: ''
  key: ''
{{ end }}
  cluster_name: {{ .Cluster }}
  erlang: {{ dedupe . "console.secrets.erlang" (randAlphaNum 14) }}
  id_rsa: {{ ternary .Values.private_key (dedupe . "console.secrets.id_rsa" "") (hasKey .Values "private_key") | quote }}
  id_rsa_pub: {{ ternary .Values.public_key (dedupe . "console.secrets.id_rsa_pub" "") (hasKey .Values "public_key") | quote }}
  ssh_passphrase: {{ ternary .Values.passphrase (dedupe . "console.secrets.ssh_passphrase" "") (hasKey .Values "passphrase") | quote }}
  git_access_token: {{ ternary .Values.access_token (dedupe . "console.secrets.git_access_token" "") (hasKey .Values "access_token") | quote }}
  git_user: {{ default "console" .Values.git_user }}
  git_email: {{ default "console@plural.sh" .Values.git_email }}
{{ if .OIDC }}
  plural_client_id: {{ .OIDC.ClientId }}
  plural_client_secret: {{ .OIDC.ClientSecret }}
{{ end }}
{{ if .Values.is_demo }}
  is_demo: {{ .Values.is_demo }}
{{ end }}

license: {{ .License | quote }}

{{- if .Values.testBase.enabled }}
test-base:
  enabled: true
  secret:
    CYPRESS_EMAIL: {{ .Values.testBase.cypressEmail }}
    CYPRESS_PASSWORD: {{ .Values.testBase.cypressPassword }}
    CYPRESS_BASE_URL: https://{{ .Values.console_dns }}/
{{- end }}
