use Mix.Config

config :watchman,
  ecto_repos: [Watchman.Repo]


config :piazza_core,
  repos: [Watchman.Repo]

config :botanist,
  ecto_repo: Watchman.Repo

config :piazza_core,
  shutdown_delay: 60 * 1000


config :watchman, WatchmanWeb.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "1rkd5+lxJbdTadyxW7qF/n1fNzKPV010PKf8SEGmUrXwMw0iAZyoyZgWEwr6nmCJ",
  render_errors: [view: WatchmanWeb.ErrorView, accepts: ~w(html json)],
  pubsub: [name: Watchman.PubSub, adapter: Phoenix.PubSub.PG2],
  server: true

config :watchman,
  prometheus: "prometheus",
  loki: "loki",
  git_user_name: "forge",
  git_user_email: "forge@piazzaapp.com",
  forge_url: "https://forge.piazza.app/gql",
  url: "https://watchman.piazzaapp.com",
  incoming_webhook: "https://some.piazza.webhook"

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason

config :watchman, Watchman.Guardian,
  issuer: "watchman",
  secret_key: "watchman_secret"

config :watchman, Watchman.Repo,
  migration_timestamps: [type: :utc_datetime_usec]

config :libcluster, :topologies, []

config :kazan, :server, :in_cluster

config :ra, data_dir: Path.join([Path.dirname(__DIR__), "priv", "data"]) |> String.to_charlist()

config :watchman,
  replicas: 1,
  nodes: []

import_config "#{Mix.env()}.exs"
