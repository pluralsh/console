import Config

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
  Console.Deployments.PubSub.Broadcast,
  Console.Deployments.PubSub.Pipeline,
  Console.Deployments.PubSub.Notifications,
]

config :console, Console.Cron.Scheduler,
  # overlap: false,
  jobs: [
    {"@daily", {Console.Cron.Jobs, :prune_builds, []}},
    {"@daily", {Console.Cron.Jobs, :prune_invites, []}},
    {"@daily", {Console.Cron.Jobs, :prune_refresh_tokens, []}},
    {"*/15 * * * *", {Console.Cron.Jobs, :fail_builds, []}},
    {"*/5 * * * *", {Console.Deployments.Cron, :prune_clusters, []}},
    {"*/5 * * * *", {Console.Deployments.Cron, :prune_services, []}},
    {"*/5 * * * *", {Console.Deployments.Cron, :install_clusters, []}},
    {"*/10 * * * *", {Console.Deployments.Cron, :poll_stacks, []}},
    {"*/10 * * * *", {Console.Deployments.Cron, :dequeue_stacks, []}},
    {"*/10 * * * *", {Console.Deployments.Cron, :place_run_workers, []}},
    {"*/30 * * * *", {Console.Deployments.Cron, :spawn_stack_crons, []}},
    {"*/2 * * * *", {Console.Deployments.Cron, :scan_pipeline_stages, []}},
    {"*/2 * * * *", {Console.Deployments.Cron, :scan_pending_promotions, []}},
    {"*/2 * * * *", {Console.Deployments.Cron, :scan_pending_contexts, []}},
    {"*/10 * * * *", {Console.Deployments.Init, :ensure_secret, []}},
    {"0 0 1-31/2 * *", {Console.Deployments.Cron, :backfill_deprecations, []}},
    {"*/10 * * * *", {Console.Deployments.Cron, :backfill_global_services, []}},
    {"*/10 * * * *", {Console.Deployments.Cron, :backfill_managed_namespaces, []}},
    {"35 * * * *", {Console.Deployments.Cron, :drain_managed_namespaces, []}},
    {"45 * * * *", {Console.Deployments.Cron, :migrate_kas, []}},
    {"30 * * * *", {Console.Deployments.Cron, :migrate_agents, []}},
    {"15 * * * *", {Console.Deployments.Cron, :update_upgrade_plans, []}},
    {"@daily", {Console.Deployments.Cron, :rotate_deploy_tokens, []}},
    {"@daily", {Console.Deployments.Cron, :prune_revisions, []}},
    {"@daily", {Console.Deployments.Cron, :prune_migrations, []}},
    {"@daily", {Console.Deployments.Cron, :prune_logs, []}},
    {"@daily", {Console.Cron.Jobs, :prune_notifications, []}},
    {"@daily", {Console.Cron.Jobs, :prune_audits, []}},
  ]

config :console, :watchers, [
  Console.Watchers.Application,
  # Console.Watchers.Plural,
  Console.Watchers.Upgrade,
  Console.Watchers.Pod,
  Console.Watchers.Postgres,
]

config :console,
  prometheus: "http://monitoring-prometheus.monitoring:9090",
  loki: "http://monitoring-loki.monitoring:3100"
