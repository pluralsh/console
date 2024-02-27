import Config
import System, only: [get_env: 1, get_env: 2]
import Console, only: [is_set: 1]

config :ra,
  data_dir: '/data/ra'

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
  check_origin: ["//#{get_env("HOST")}", "//#{get_env("EXT_HOST") || get_env("HOST")}", "//console"]

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


if get_env("POSTGRES_URL") do
  config :console, Console.Repo,
    url: get_env("POSTGRES_URL"),
    ssl: String.to_existing_atom(get_env("DBSSL") || "true"),
    pool_size: 10
else
  config :console, Console.Repo,
    database: "console",
    username: "console",
    password: get_env("POSTGRES_PASSWORD"),
    hostname: get_env("DBHOST") || "console-postgresql",
    ssl: String.to_existing_atom(get_env("DBSSL") || "false"),
    pool_size: 10
end

git_url = get_env("GIT_URL")

add_https = fn
  "https://" <> _ = url -> url
  url -> "https://#{url}"
end

config :console,
  workspace_root: "/root",
  git_askpass: "/root/bin/.git-askpass",
  ssh_askpass: "/root/bin/.ssh-askpass",
  git_url: get_env("GIT_URL"),
  branch: get_env("BRANCH_NAME") || "master",
  repo_root: get_env("REPO_ROOT") || "workspace",
  git_ssh_key: {:home, ".ssh/id_rsa"},
  webhook_secret: get_env("WEBHOOK_SECRET"),
  git_user_name: get_env("GIT_USER", "plural"),
  git_user_email: get_env("GIT_EMAIL", "console@plural.sh"),
  url: get_env("HOST"),
  ext_url: add_https.(get_env("EXT_HOST") || get_env("HOST")),
  cluster_name: get_env("CLUSTER_NAME"),
  is_demo_project: !!get_env("IS_DEMO_PROJECT"),
  is_sandbox: !!get_env("CONSOLE_SANDBOX"),
  provider: provider,
  build_id: get_env("CONSOLE_BUILD_ID"),
  kas_dns: get_env("KAS_DNS"),
  byok: get_env("CONSOLE_BYOK") == "true"

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

if is_set("BACKUP_ACCESS_KEY") and is_set("BACKUP_SECRET_ACCESS_KEY") do
  config :console, :backup_keys,
    s3_access_key_id: get_env("BACKUP_ACCESS_KEY"),
    s3_secret_access_key: get_env("BACKUP_SECRET_ACCESS_KEY")
end
