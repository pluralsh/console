import Config
import System, only: [get_env: 1, get_env: 2]
import Console, only: [is_set: 1]

config :console, Console.LocalRepo,
  adapter: Ecto.Adapters.SQLite3,
  database: "/tmp/sqlite/local.db"

config :arc,
  storage: Arc.Storage.GCS,
  bucket: get_env("GCS_BUCKET")

config :console,
  git_commit: get_env("GIT_COMMIT")

config :piazza_core, aes_key: get_env("AES_KEY")

if get_env("PLURAL_CLIENT_ID") do
  config :console,
    plural_login: true

  config :console, :oidc_providers,
    plural: [
      discovery_document_uri: get_env("PLURAL_DISCOVERY_URL") || "https://oidc.plural.sh/.well-known/openid-configuration",
      client_id: get_env("PLURAL_CLIENT_ID"),
      client_secret: get_env("PLURAL_CLIENT_SECRET") || :unauthenticated,
      redirect_uri: "https://#{get_env("HOST")}/oauth/callback",
      response_type: "code",
      pkce_enabled: get_env("OIDC_PKCE_ENABLED") == "true",
      scope: "openid"
    ]
end

if get_env("OIDC_CLIENT_ID") do
  config :console,
    plural_login: true,
    oidc_login: true

  config :openid_connect, refresh: 2 * 60 * 1000

  config :console, :oidc_providers,
    plural: [
      discovery_document_uri: get_env("OIDC_DISCOVERY_URL"),
      client_id: get_env("OIDC_CLIENT_ID"),
      client_secret: get_env("OIDC_CLIENT_SECRET"),
      redirect_uri: "https://#{get_env("HOST")}/oauth/callback",
      response_type: "code",
      pkce_enabled: get_env("OIDC_PKCE_ENABLED") == "true",
      scope: get_env("OIDC_SCOPES") || "openid email"
    ]
end

if get_env("PROMETHEUS_HOST") do
  config :console, :prometheus, get_env("PROMETHEUS_HOST")
end

if get_env("LOKI_HOST") do
  config :console, :loki, get_env("LOKI_HOST")
end

if get_env("CONSOLE_LICENSE_KEY") do
  config :console, :license_key, get_env("CONSOLE_LICENSE_KEY")
end

if get_env("GRAFANA_TENANT") do
  config :console, :grafana_tenant, get_env("GRAFANA_TENANT")
end

if get_env("CONSOLE_QPS") do
  config :console, :qps, String.to_integer(get_env("CONSOLE_QPS"))
end

if get_env("CONSOLE_VERSION") do
  config :console, :version, get_env("CONSOLE_VERSION")
end

config :elixir, :ansi_enabled, true

config :ra,
  data_dir: ~c"/data/ra"

config :piazza_core,
  repos: [Console.Repo]

config :botanist,
  ecto_repo: Console.Repo

replicas = get_env("REPLICAS", "1") |> String.to_integer()

config :console,
  replicas: replicas

config :libcluster,
  topologies: [
    console: [
      strategy: Cluster.Strategy.Kubernetes,
      config: [
        mode: :ip,
        kubernetes_node_basename: "console",
        kubernetes_selector: "app=console",
        kubernetes_namespace: get_env("NAMESPACE"),
        polling_interval: 10_000
      ]
    ]
  ]

config :console, Console.Guardian,
  issuer: get_env("HOST"),
  secret_key: get_env("JWT_SECRET")

[_ | rest] = get_env("HOST") |> String.split(".")

config :console, ConsoleWeb.Endpoint,
  url: [host: get_env("HOST"), port: 80],
  check_origin: ["//#{get_env("HOST")}", "//#{get_env("EXT_HOST") || get_env("HOST")}", "//#{get_env("WEBHOOK_HOST") || get_env("HOST")}", "//console"]

provider = case get_env("PROVIDER") do
  "google" -> :gcp
  "gcp" -> :gcp
  "aws" -> :aws
  "azure" -> :azure
  "equinix" -> :equinix
  _ -> :kubernetes
end

if provider != :gcp do
  config :goth, disabled: true
end

pool_size =
  with size when is_binary(size) and byte_size(size) > 0 <- get_env("DB_POOL_SIZE"),
       {val, _} <- Integer.parse(size) do
    val
  else
    _ -> 50
  end

ssl_opts = case {get_env("PGROOTSSLCERT"), get_env("DB_CLOUD_PROVIDER")} do
  {_, "aws"} -> Console.Repo.rds_ssl_opts(:aws, get_env("POSTGRES_URL"))
  {_, "azure"} -> Console.Repo.rds_ssl_opts(:azure, get_env("POSTGRES_URL"))
  {cert, _} when is_binary(cert) and byte_size(cert) > 0 -> [cacertfile: cert]
  _ -> [verify: :verify_none]
end

if get_env("POSTGRES_URL") do
  config :console, Console.Repo,
    url: get_env("POSTGRES_URL"),
    ssl: String.to_existing_atom(get_env("DBSSL") || "true"),
    ssl_opts: ssl_opts,
    pool_size: pool_size
else
  config :console, Console.Repo,
    database: get_env("POSTGRES_DB") || "console",
    username: get_env("POSTGRES_USER") || "console",
    password: get_env("POSTGRES_PASSWORD"),
    hostname: get_env("DBHOST") || "console-postgresql",
    ssl: String.to_existing_atom(get_env("DBSSL") || "false"),
    ssl_opts: ssl_opts,
    pool_size: pool_size
end

git_url = get_env("GIT_URL")

add_https = fn
  "https://" <> _ = url -> url
  url -> "https://#{url}"
end

config :console,
  workspace_root: "/root",
  cloudquery_host: get_env("CONSOLE_CLOUDQUERY_HOST") || "console-cloud-query.#{get_env("NAMESPACE")}:9192",
  git_askpass: "/opt/app/bin/.git-askpass",
  ssh_askpass: "/opt/app/bin/.ssh-askpass",
  git_url: get_env("GIT_URL"),
  branch: get_env("BRANCH_NAME") || "master",
  repo_root: get_env("REPO_ROOT") || "workspace",
  git_ssh_key: {:home, ".ssh/id_rsa"},
  webhook_secret: get_env("WEBHOOK_SECRET"),
  git_user_name: get_env("GIT_USER", "plural"),
  git_user_email: get_env("GIT_EMAIL", "console@plural.sh"),
  url: add_https.(get_env("HOST")),
  hostname: get_env("HOST"),
  ext_url: add_https.(get_env("EXT_HOST") || get_env("HOST")),
  webhook_url: add_https.(get_env("WEBHOOK_HOST") || get_env("EXT_HOST") || get_env("HOST")),
  cluster_name: get_env("CLUSTER_NAME"),
  is_demo_project: !!get_env("IS_DEMO_PROJECT"),
  is_sandbox: !!get_env("CONSOLE_SANDBOX"),
  provider: provider,
  sidecar_token: Console.rand_alphanum(32),
  sidecar_token_path: "/shared",
  build_id: get_env("CONSOLE_BUILD_ID"),
  kas_dns: get_env("KAS_DNS"),
  cloud: get_env("CONSOLE_CLOUD") == "true",
  cloud_instance: get_env("CONSOLE_CLOUD_INSTANCE"),
  es_password: get_env("CONSOLE_CLOUD_ES_PASSWORD"),
  vmetrics_tenant: get_env("CONSOLE_VMETRICS_TENANT"),
  vmetrics_url: get_env("CONSOLE_VMETRICS_URL"),
  es_url: get_env("CONSOLE_CLOUD_ES_URL"),
  byok: get_env("CONSOLE_BYOK") == "true",
  airgap: get_env("CONSOLE_AIRGAP") == "true",
  nowatchers: get_env("CONSOLE_NOWATCHERS") == "true",
  oidc_name: get_env("CONSOLE_OIDC_LOGIN_NAME")

if git_url && String.starts_with?(git_url, "https") do
  config :console,
    git_ssh_key: :pass
end

if is_set("GITHUB_RAW_URL") do
  config :console,
    github_raw_url: get_env("GITHUB_RAW_URL")
end

if !!get_env("CONSOLE_LOGIN_KEY") and get_env("CONSOLE_LOGIN_EMAIL") do
  config :console, :login_link,
    key: get_env("CONSOLE_LOGIN_KEY"),
    email: get_env("CONSOLE_LOGIN_EMAIL")
end

if is_set("CONSOLE_ADMIN_EMAILS") do
  config :console,
    admin_emails: String.split(get_env("CONSOLE_ADMIN_EMAILS"), ~r/\s*,\s*/, trim: true)
end

config :console,
  org_email_suffix: get_env("ORG_EMAIL_SUFFIX", "")

if is_set("CONSOLE_DEPLOY_OPERATOR_URL") do
  config :console,
    deploy_url: get_env("CONSOLE_DEPLOY_OPERATOR_URL")
end

if is_set("CONSOLE_ARTIFACTS_URL") do
  config :console,
    artifacts_url: get_env("CONSOLE_ARTIFACTS_URL")
end

if is_set("CONSOLE_DEFAULT_GIT_PASSWORD") do
  config :console,
    git_auth_attrs: %{
      password: get_env("CONSOLE_DEFAULT_GIT_PASSWORD"),
      username: get_env("CONSOLE_DEFAULT_GIT_USERNAME") || "apikey"
    }
end

if is_set("CONSOLE_DEFAULT_GIT_PRIVATE_KEY") do
  config :console,
    git_auth_attrs: %{
      private_key: get_env("CONSOLE_DEFAULT_GIT_PRIVATE_KEY"),
      passphrase: get_env("CONSOLE_DEFAULT_GIT_PASSPHRASE")
    }
end

if is_set("BACKUP_ACCESS_KEY") and is_set("BACKUP_SECRET_ACCESS_KEY") do
  config :console, :backup_keys,
    s3_access_key_id: get_env("BACKUP_ACCESS_KEY"),
    s3_secret_access_key: get_env("BACKUP_SECRET_ACCESS_KEY")
end

if is_set("CONSOLE_HYDRA_ADMIN") and is_set("CONSOLE_HYDRA_PUBLIC") do
  config :console, Console.Hydra.Client,
    hydra_admin: get_env("CONSOLE_HYDRA_ADMIN"),
    hydra_public: get_env("CONSOLE_HYDRA_PUBLIC")
end

if is_set("CONSOLE_GITHUB_APP_ID") and is_set("CONSOLE_GITHUB_APP_PEM") do
  config :console,
    github_app_id: get_env("CONSOLE_GITHUB_APP_ID"),
    github_app_pem: get_env("CONSOLE_GITHUB_APP_PEM")
end

if is_set("CONSOLE_GITHUB_HTTP_PROXY") do
  config :tentacat,
    request_options: [proxy: to_charlist(get_env("CONSOLE_GITHUB_HTTP_PROXY"))]
end
