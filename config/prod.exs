use Mix.Config

config :watchman, :initialize, true

config :watchman, WatchmanWeb.Endpoint,
  http: [port: 4000, compress: true],
  # force_ssl: [hsts: true, rewrite_on: [:x_forwarded_proto]],
  cache_static_manifest: "priv/static/cache_manifest.json",
  server: true

config :logger, level: :info

config :goth, json: {:system, "GCP_CREDENTIALS"}

config :watchman, :consumers, [
  Watchman.PubSub.Consumers.Webhook,
  Watchman.PubSub.Consumers.Recurse,
  Watchman.PubSub.Consumers.Rtc,
  Watchman.PubSub.Consumers.Audit,
]

config :watchman, Watchman.Cron,
  jobs: [
    {"@daily", {Watchman.Cron.Jobs, :prune_builds, []}},
    {"@daily", {Watchman.Cron.Jobs, :prune_invites, []}}
  ]

config :watchman, :watchers, [
  Watchman.Watchers.Application,
  Watchman.Watchers.Plural,
  Watchman.Watchers.Upgrade
]

config :watchman,
  prometheus: "http://bootstrap-prometheus-server.bootstrap",
  loki: "http://bootstrap-loki.bootstrap:3100"
