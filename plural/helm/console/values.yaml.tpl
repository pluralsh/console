global:
  application:
    links:
    - description: console web ui
      url: {{ .Values.console_dns }}

ingress:
  console_dns: {{ .Values.console_dns }}

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
  admin_email: {{ .Values.admin_email }}
  admin_password: {{ dedupe . "console.secrets.admin_password" (randAlphaNum 20) }}
{{ if .Values.console_dns }}
  git_url: {{ dedupe . "console.secrets.git_url" repoUrl }}
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
  known_hosts: {{ knownHosts | quote }}
{{ else }}
  git_url: ''
  repo_root: ''
  branch_name: ''
  config: ''
  key: ''
  known_hosts: ''
{{ end }}
  cluster_name: {{ .Cluster }}
  erlang: {{ dedupe . "console.secrets.erlang" (randAlphaNum 14) }}
  id_rsa: {{ ternary .Values.private_key (dedupe . "console.secrets.id_rsa" "") (hasKey .Values "private_key") | quote }}
  id_rsa_pub: {{ ternary .Values.public_key (dedupe . "console.secrets.id_rsa_pub" "") (hasKey .Values "public_key") | quote }}
  ssh_passphrase: {{ ternary .Values.passphrase (dedupe . "console.secrets.ssh_passphrase" "") (hasKey .Values "passphrase") | quote }}
  git_access_token: {{ ternary .Values.access_token (dedupe . "console.secrets.git_access_token" "") (hasKey .Values "git_access_token") | quote }}
  git_user: {{ default "console" .Values.git_user }}
  git_email: {{ default "console@plural.sh" .Values.git_email }}
{{ if .OIDC }}
  plural_client_id: {{ .OIDC.ClientId }}
  plural_client_secret: {{ .OIDC.ClientSecret }}
{{ end }}

license: {{ .License | quote }}