postgresql:
  postgresqlPassword: {{ dedupe . "watchman.postgresql.postgresqlPassword" (randAlphaNum 20) }}

ingress:
  watchman_dns: {{ .Values.watchman_dns }}

provider: {{ .Provider }}

serviceAccount:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::{{ .Project }}:role/{{ .Cluster }}-watchman

secrets:
  jwt: {{ dedupe . "watchman.secrets.jwt" (randAlphaNum 20) }}
  admin_name: {{ .Values.admin_name }}
  admin_email: {{ .Values.admin_email }}
  admin_password: {{ dedupe . "watchman.secrets.admin_password" (randAlphaNum 20) }}
{{ if .Values.watchman_dns }}
  git_url: {{ repoUrl }}
  repo_root: {{ repoName }}
  branch_name: {{ branchName }}
  config: {{ readFile (homeDir ".plural" "config.yml") | quote }}
  key: {{ readFile (homeDir ".plural" "key") | quote }}
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
  erlang: {{ dedupe . "watchman.secrets.erlang" (randAlphaNum 14) }}
{{ if and (hasKey . "watchman") (hasKey .watchman "secrets") }}
  webhook_secret: {{ .watchman.secrets.webhook_secret }}
  id_rsa: {{ .watchman.secrets.id_rsa | quote }}
  id_rsa_pub: {{ .watchman.secrets.id_rsa_pub | quote }}
{{ else if .Values.watchman_dns }}
  {{ $id_rsa := readLineDefault "Enter the path to your deploy keys" (homeDir ".ssh" "id_rsa") }}
  id_rsa: {{ readFile $id_rsa | quote }}
  id_rsa_pub: {{ readFile (printf "%s.pub" $id_rsa) | quote }}
{{ end }}
{{ if hasKey .Values "git_user" }}
  git_user: {{ .Values.git_user }}
{{ else }}
  git_user: forge
{{ end }}
{{ if hasKey .Values "git_email" }}
  git_email: {{ .Values.git_email }}
{{ else }}
  git_email: forge@piazzaapp.com
{{ end }}

license: {{ .License | quote }}