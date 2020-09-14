import Config
import System, only: [get_env: 1, get_env: 2]

config :piazza_core,
  repos: [Watchman.Repo]

config :botanist,
  ecto_repo: Watchman.Repo

config :watchman, Watchman.Guardian,
  issuer: "watchman",
  secret_key: get_env("JWT_SECRET")

[_ | rest] = get_env("HOST") |> String.split(".")

config :watchman, WatchmanWeb.Endpoint,
  url: [host: get_env("HOST"), port: 80],
  check_origin: ["//#{get_env("HOST")}", "//watchman-grafana.#{Enum.join(rest, ".")}", "//watchman"]

config :watchman, Watchman.Repo,
  database: "watchman",
  username: "watchman",
  password: get_env("POSTGRES_PASSWORD"),
  hostname: "watchman-postgresql",
  pool_size: 10

config :watchman,
  workspace_root: "/root",
  git_url: get_env("GIT_URL"),
  repo_root: get_env("REPO_ROOT"),
  forge_config: "/ect/forge/.forge",
  webhook_secret: get_env("WEBHOOK_SECRET"),
  git_ssh_key: {:home, ".ssh/id_rsa"},
  git_user_name: get_env("GIT_USER", "forge"),
  git_user_email: get_env("GIT_EMAIL", "forge@piazzaapp.com"),
  url: get_env("HOST"),
  incoming_webhook: get_env("PIAZZA_INCOMING_WEBHOOK"),
  grafana_dns: get_env("GRAFANA_DNS"),
  piazza_secret: get_env("PIAZZA_WEBHOOK_SECRET")