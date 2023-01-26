import Config
import System, only: [get_env: 1, get_env: 2]

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
      connect: {Console.Clustering.Connect, :connect, []},
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
  check_origin: ["//#{get_env("HOST")}", "//console"]

provider = case get_env("PROVIDER") do
  "google" -> :gcp
  "gcp" -> :gcp
  "aws" -> :aws
  "azure" -> :azure
  "equinix" -> :equinix
  _ -> :custom
end

if provider != :gcp do
  config :goth, disabled: true
end

config :console, Console.Repo,
  database: "console",
  username: "console",
  password: get_env("POSTGRES_PASSWORD"),
  hostname: get_env("DBHOST") || "console-postgresql",
  ssl: String.to_existing_atom(get_env("DBSSL") || "false"),
  pool_size: 10

git_url = get_env("GIT_URL")

config :console,
  workspace_root: "/root",
  git_url: get_env("GIT_URL"),
  branch: get_env("BRANCH_NAME") || "master",
  repo_root: get_env("REPO_ROOT"),
  forge_config: "/ect/forge/.forge",
  git_ssh_key: {:home, ".ssh/id_rsa"},
  webhook_secret: get_env("WEBHOOK_SECRET"),
  git_user_name: get_env("GIT_USER", "forge"),
  git_user_email: get_env("GIT_EMAIL", "forge@piazzaapp.com"),
  url: get_env("HOST"),
  incoming_webhook: get_env("PIAZZA_INCOMING_WEBHOOK"),
  grafana_dns: get_env("GRAFANA_DNS"),
  piazza_secret: get_env("PIAZZA_WEBHOOK_SECRET"),
  cluster_name: get_env("CLUSTER_NAME"),
  is_demo_project: !!get_env("IS_DEMO_PROJECT"),
  is_sandbox: !!get_env("CONSOLE_SANDBOX"),
  provider: provider,
  build_id: get_env("CONSOLE_BUILD_ID")

if String.starts_with?(git_url, "https") do
  config :console,
    git_ssh_key: :pass
end

if !!get_env("CONSOLE_LOGIN_KEY") and get_env("CONSOLE_LOGIN_EMAIL") do
  config :console, :login_link,
    key: get_env("CONSOLE_LOGIN_KEY"),
    email: get_env("CONSOLE_LOGIN_EMAIL")
end
