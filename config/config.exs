import Config

config :console,
  ecto_repos: [Console.Repo],
  socket: :forge_socket

config :piazza_core,
  repos: [Console.Repo]

config :botanist,
  ecto_repo: Console.Repo

config :piazza_core,
  shutdown_delay: 60 * 1000

config :console, :oidc_providers, []
config :console,
    plural_login: false

config :console, ConsoleWeb.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "1rkd5+lxJbdTadyxW7qF/n1fNzKPV010PKf8SEGmUrXwMw0iAZyoyZgWEwr6nmCJ",
  render_errors: [view: ConsoleWeb.ErrorView, accepts: ~w(html json)],
  pubsub_server: Console.PubSub,
  server: true

or_nil = fn
  {:ok, v} -> v
  _ -> nil
end

config :console,
  secret_store: Console.Deployments.Secrets.Database,
  revision_history_limit: 20,
  prometheus: "prometheus",
  loki: "loki",
  git_user_name: "plural",
  git_user_email: "bot@plural.sh",
  cloudquery_host: "console-cloud-query:9192",
  forge_url: "https://forge.piazza.app/gql",
  plural_url: "https://app.plural.sh/gql",
  url: "https://my.plural.console",
  ext_url: "https://my.plural.console",
  webhook_url: "https://my.plural.console",
  incoming_webhook: "https://some.piazza.webhook",
  github_raw_url: "https://raw.githubusercontent.com",
  plrl_assets_url: "https://assets.plural.sh",
  cluster_name: "default",
  git_commit: "abd132",
  git_askpass: "bin/.git-askpass",
  ssh_askpass: "bin/.ssh-askpass",
  provider: :aws,
  audit_expiry: 30,
  admin_emails: [],
  cloud: false,
  chunk_size: 1024 * 10,
  sidecar_token: "example",
  sidecar_token_path: "./secrets",
  cache_adapter: Console.Cache,
  local_cache: Console.LocalCache,
  multilevel_cache: Console.MultilevelCache,
  version: Mix.Project.config[:version],
  kas_dns: "https://kas.example.com",
  qps: 1_000,
  nowatchers: false,
  default_project_name: "default",
  prom_plugins: [Console.Prom.Plugin],
  cloudquery: false,
  jwt_pub_key: or_nil.(File.read("config/pubkey.pem"))

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason

config :console, Console.Guardian,
  ttl: {30, :minutes},
  issuer: "console",
  secret_key: "console_secret" # this gets overwritten in release config

config :console, Console.Repo,
  queue_target: 1000,
  migration_timestamps: [type: :utc_datetime_usec]

config :libcluster, :topologies, []

config :tzdata, :autoupdate, :disabled

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
    Console.Watchers.Pod
  ]

config :porcelain, driver: Porcelain.Driver.Basic

config :http_stream, adapter: HTTPStream.Adapter.HTTPoison

config :console, Console.PartitionedCache,
  primary: [
    gc_interval: :timer.hours(2),
    backend: :shards,
    partitions: 2,
    allocated_memory: 1000 * 1000 * 500
  ]

config :console, Console.MultilevelCache,
  model: :inclusive,
  levels: [
    {
      Console.MultilevelCache.L1,
      gc_interval: :timer.hours(12),
      backend: :shards,
      partitions: 2,
      allocated_memory: 1000 * 1000 * 10
    },
    {
      Console.MultilevelCache.L2,
      primary: [
        gc_interval: :timer.hours(12),
        backend: :shards,
        partitions: 2,
        allocated_memory: 1000 * 1000 * 200
      ]
    }
  ]

config :console, Console.Cron.Scheduler,
  # overlap: false,
  jobs: [{"* * * * *", {Console.Cron.Jobs, :noop, []}}]

config :console, :login_link, []

config :hammer,
  backend: {Hammer.Backend.ETS, [expiry_ms: 60_000 * 60 * 4,
                                 cleanup_interval_ms: 60_000 * 10]}

config :libring,
  rings: [
    cluster: [monitor_nodes: true, node_type: :visible]
  ]

config :tzdata, :autoupdate, :disabled

config :console, Console.Mailer,
  adapter: Bamboo.SMTPAdapter

config :console, Console.PromEx,
  disabled: false,
  manual_metrics_start_delay: :no_delay,
  drop_metrics_groups: [],
  grafana: :disabled,
  metrics_server: :disabled,
  version: "0.11.0"

config :console, :ttls,
  helm: :timer.minutes(30),
  cluster_metrics: :timer.hours(6)

config :console, Console.Services.OIDC.Hydra,
  hydra_admin: "http://plural-hydra-admin:4445/admin",
  hydra_public: "http://plural-hydra-public:4444"

config :phoenix, :filter_parameters, {:keep, ~w(id format)}

config :reverse_proxy_plug, :http_client, ReverseProxyPlug.HTTPClient.Adapters.Req

config :sentry,
  environment_name: Mix.env(),
  enable_source_code_context: true,
  root_source_code_paths: [File.cwd!()],
  tags: %{"plrl.flow": "console"}

import_config "#{Mix.env()}.exs"
