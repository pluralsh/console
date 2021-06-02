import Config
import System, only: [get_env: 1, get_env: 2]

config :ra,
  data_dir: '/data/ra'

config :piazza_core,
  repos: [Console.Repo]

config :botanist,
  ecto_repo: Console.Repo

replicas = get_env("REPLICAS", "1") |> String.to_integer()
nodes = Enum.map(0..(replicas - 1), & :"console@console-#{&1}.console-headless.#{get_env("NAMESPACE")}.svc.cluster.local")

config :console,
  replicas: replicas,
  nodes: nodes

config :libcluster,
  topologies: [
    watchman: [
      strategy: Cluster.Strategy.Epmd,
      config: [hosts: nodes]
    ]
  ]

config :console, Console.Guardian,
  issuer: "console",
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
  _ -> :custom
end

if provider != :gcp do
  config :goth, disabled: true
end

config :console, Console.Repo,
  database: "console",
  username: "console",
  password: get_env("POSTGRES_PASSWORD"),
  hostname: "console-postgresql",
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
  provider: provider

if String.starts_with?(git_url, "https") do
  config :console,
    git_ssh_key: :pass
end
