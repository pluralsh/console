use Mix.Config

config :console, :initialize, true

config :console, ConsoleWeb.Endpoint,
  http: [port: 4000, compress: true, protocol_options: [max_header_value_length: 8192]],
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
    {"@daily", {Console.Cron.Jobs, :prune_invites, []}},
    {"*/15 * * * *", {Console.Cron.Jobs, :fail_builds, []}},
    {"*/5 * * * *", {Console.Deployments.Cron, :prune_clusters, []}},
    {"*/5 * * * *", {Console.Deployments.Cron, :prune_services, []}},
    {"0 0 1-31/2 * *", {Console.Deployments.Cron, :backfill_deprecations, []}},
    {"20 * * * *", {Console.Deployments.Cron, :backfill_global_services, []}},
    {"@daily", {Console.Deployments.Cron, :prune_revisions, []}},
    {"@daily", {Console.Cron.Jobs, :prune_notifications, []}},
  ]

config :console, :watchers, [
  Console.Watchers.Application,
  # Console.Watchers.Plural,
  Console.Watchers.Upgrade,
  Console.Watchers.Pod,
  Console.Watchers.Postgres
]

config :console,
  prometheus: "http://monitoring-prometheus.monitoring:9090",
  loki: "http://monitoring-loki.monitoring:3100"
