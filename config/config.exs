use Mix.Config

config :console,
  ecto_repos: [Console.Repo],
  socket: :forge_socket


config :piazza_core,
  repos: [Console.Repo]

config :botanist,
  ecto_repo: Console.Repo

config :piazza_core,
  shutdown_delay: 60 * 1000

config :console, :oidc_providers, :ignore
config :console,
    plural_login: false

config :console, ConsoleWeb.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "1rkd5+lxJbdTadyxW7qF/n1fNzKPV010PKf8SEGmUrXwMw0iAZyoyZgWEwr6nmCJ",
  render_errors: [view: ConsoleWeb.ErrorView, accepts: ~w(html json)],
  pubsub_server: Console.PubSub,
  server: true

config :console,
  secret_store: Console.Deployments.Secrets.Database,
  revision_history_limit: 20,
  prometheus: "prometheus",
  loki: "loki",
  git_user_name: "plural",
  git_user_email: "bot@plural.sh",
  forge_url: "https://forge.piazza.app/gql",
  plural_url: "https://app.plural.sh/gql",
  url: "https://my.plural.console",
  ext_url: "https://my.plural.console",
  incoming_webhook: "https://some.piazza.webhook",
  cluster_name: "default",
  git_commit: "abd132",
  git_askpass: "bin/.git-askpass",
  ssh_askpass: "bin/.ssh-askpass",
  provider: :aws,
  audit_expiry: 30,
  cache_adapter: Console.Cache,
  local_cache: Console.LocalCache,
  version: Mix.Project.config[:version],
  kas_dns: "https://kas.example.com",
  qps: 40

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason

config :console, Console.Guardian,
  issuer: "watchman",
  secret_key: "watchman_secret"

config :console, Console.Repo,
  migration_timestamps: [type: :utc_datetime_usec]

config :libcluster, :topologies, []

config :kazan, :server, :in_cluster

config :ra,
  data_dir: Path.join([Path.dirname(__DIR__), "priv", "data"]) |> String.to_charlist(),
  wal_max_entries: 2000, # we don't need a ton here
  wal_max_size_bytes: 100_000

config :console,
  replicas: 1,
  nodes: [],
  watchers: [],
  optional_watchers: [
    Console.Watchers.Application,
    Console.Watchers.Postgres,
  ]

config :porcelain, driver: Porcelain.Driver.Basic

config :http_stream, adapter: HTTPStream.Adapter.HTTPoison

config :console, Console.PartitionedCache,
  primary: [
    gc_interval: :timer.seconds(3600),
    backend: :shards,
    partitions: 2,
    allocated_memory: 1000 * 1000 * 500
  ]

config :console, :login_link, []

config :hammer,
  backend: {Hammer.Backend.ETS, [expiry_ms: 60_000 * 60 * 4,
                                 cleanup_interval_ms: 60_000 * 10]}

import_config "#{Mix.env()}.exs"
