use Mix.Config

config :console, :initialize, true

config :console, ConsoleWeb.Endpoint,
  http: [port: 4000, compress: true],
  # force_ssl: [hsts: true, rewrite_on: [:x_forwarded_proto]],
  cache_static_manifest: "priv/static/cache_manifest.json",
  server: true

config :logger, level: :info

config :goth, json: {:system, "GCP_CREDENTIALS"}

config :console, :consumers, [
  Console.PubSub.Consumers.Webhook,
  Console.PubSub.Consumers.Recurse,
  Console.PubSub.Consumers.Rtc,
  Console.PubSub.Consumers.Audit,
]

config :console, Console.Cron,
  jobs: [
    {"@daily", {Console.Cron.Jobs, :prune_builds, []}},
    {"@daily", {Console.Cron.Jobs, :prune_invites, []}}
  ]

config :console, :watchers, [
  Console.Watchers.Application,
  Console.Watchers.Plural,
  Console.Watchers.Upgrade
]

config :console,
  prometheus: "http://bootstrap-prometheus.bootstrap:9090",
  loki: "http://bootstrap-loki.bootstrap:3100"
