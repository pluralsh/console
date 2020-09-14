use Mix.Config

config :watchman, :initialize, true

config :watchman, WatchmanWeb.Endpoint,
  http: [port: 4000],
  # force_ssl: [hsts: true, rewrite_on: [:x_forwarded_proto]],
  cache_static_manifest: "priv/static/cache_manifest.json",
  server: true

config :logger, level: :info

config :goth, json: {:system, "GCP_CREDENTIALS"}

config :watchman, :consumers, [
  Watchman.PubSub.Consumers.Webhook,
  Watchman.PubSub.Consumers.Recurse
]

config :watchman, Watchman.Cron,
  jobs: [
    {"@daily", {Watchman.Cron.Jobs, :prune_builds, []}},
    {"@daily", {Watchman.Cron.Jobs, :prune_invites, []}}
  ]