import Config

config :console, :initialize, true

config :console, ConsoleWeb.Endpoint,
  http: [
    port: 4000,
    compress: true,
    protocol_options: [
      max_header_value_length: 8192,
    ]
  ],
  # force_ssl: [hsts: true, rewrite_on: [:x_forwarded_proto]],
  cache_static_manifest: "priv/static/cache_manifest.json",
  server: true

config :logger, level: :info

config :goth, json: {:system, "GCP_CREDENTIALS"}

config :console, :consumers, [
  Console.PubSub.Consumers.Recurse,
  Console.PubSub.Consumers.Rtc,
  Console.PubSub.Consumers.Audit,
  Console.Deployments.PubSub.Broadcast,
  Console.Deployments.PubSub.Pipeline,
  Console.Deployments.PubSub.Notifications,
  Console.Deployments.PubSub.Preview,
  Console.Deployments.PubSub.Email,
  Console.Deployments.PubSub.Governance,
  Console.AI.PubSub.Consumer,
  Console.AI.PubSub.Vector.Consumer,
  Console.AI.PubSub.Agent.Consumer
]

config :console, Console.Cron.Scheduler,
  # overlap: false,
  jobs: [
    {"@daily",         {Console.Cron.Jobs, :prune_builds, []}},
    {"@daily",         {Console.Cron.Jobs, :prune_invites, []}},
    {"@daily",         {Console.Cron.Jobs, :prune_refresh_tokens, []}},
    {"*/15 * * * *",   {Console.Cron.Jobs, :fail_builds, []}},
    {"*/5 * * * *",    {Console.Deployments.Cron, :prune_clusters, []}},
    {"*/5 * * * *",    {Console.Deployments.Cron, :prune_services, []}},
    {"*/5 * * * *",    {Console.Deployments.Cron, :install_clusters, []}},
    {"*/5 * * * *",    {Console.Deployments.Cron, :run_observers, []}},
    {"* * * * *",      {Console.Deployments.Cron, :poll_stacks, []}},
    {"*/10 * * * *",   {Console.Deployments.Cron, :place_run_workers, []}},
    {"*/30 * * * *",   {Console.Deployments.Cron, :spawn_stack_crons, []}},
    {"*/4 * * * *",    {Console.Deployments.Cron, :scan_pipeline_stages, []}},
    {"*/4 * * * *",    {Console.Deployments.Cron, :scan_pending_promotions, []}},
    {"*/4 * * * *",    {Console.Deployments.Cron, :scan_pending_contexts, []}},
    {"*/5 * * * *",    {Console.Deployments.Cron, :cache_warm, []}},
    {"*/10 * * * *",   {Console.Deployments.Init, :ensure_secret, []}},
    {"*/5 * * * *",    {Console.AI.Cron, :services, []}},
    {"*/5 * * * *",    {Console.AI.Cron, :stacks, []}},
    {"*/5 * * * *",    {Console.AI.Cron, :clusters, []}},
    {"*/5 * * * *",    {Console.AI.Cron, :alerts, []}},
    {"30 * * * *",     {Console.AI.Cron, :threads, []}},
    {"0 0 1-31/2 * *", {Console.Deployments.Cron, :backfill_deprecations, []}},
    {"* * * * *",      {Console.Deployments.Cron, :backfill_global_services, []}},
    {"*/15 * * * *",   {Console.Deployments.Cron, :backfill_managed_namespaces, []}},
    {"35 * * * *",     {Console.Deployments.Cron, :drain_managed_namespaces, []}},
    {"30 * * * *",     {Console.Deployments.Cron, :migrate_agents, []}},
    {"15 * * * *",     {Console.Deployments.Cron, :update_upgrade_plans, []}},
    {"0 */2 * * *",    {Console.Email.Digest, :normal, []}},
    {"0 0 * * *",      {Console.Deployments.Cron, :rotate_deploy_tokens, []}},
    {"15 0 * * *",     {Console.Deployments.Cron, :prune_revisions, []}},
    {"30 0 * * *",     {Console.Deployments.Cron, :prune_migrations, []}},
    {"45 0 * * *",     {Console.Deployments.Cron, :prune_logs, []}},
    {"0 1 * * *",      {Console.Deployments.Cron, :prune_notifications, []}},
    {"15 1 * * *",     {Console.Deployments.Cron, :prune_cluster_audit_logs, []}},
    {"0 * * * *",      {Console.Deployments.Cron, :prune_policy, []}},
    {"15 * * * *",     {Console.Deployments.Cron, :prune_vuln_reports, []}},
    {"*/15 * * * *",   {Console.Deployments.Cron, :pr_governance, []}},
    {"30 1 * * *",     {Console.Cron.Jobs, :prune_notifications, []}},
    {"45 1 * * *",     {Console.Cron.Jobs, :prune_audits, []}},
    {"0 2 * * *",      {Console.Deployments.Cron, :prune_alerts, []}},
    {"15 2 * * *",     {Console.AI.Cron, :trim, []}},
    {"30 2 * * *",     {Console.AI.Cron, :trim_threads, []}},
    {"45 2 * * *",     {Console.AI.Cron, :trim_mcp_logs, []}},
    {"15 */2 * * *",   {Console.AI.Cron, :vector_expire, []}},
    {"45 2 * * *",     {Console.Cost.Cron, :history, []}},
    {"0 3 * * *",      {Console.Cost.Cron, :prune, []}},
    {"0 0 * * 0",      {Console.AI.Cron, :chats, []}}
  ]

config :ex_aws,
  region: {:system, "AWS_REGION"},
  secret_access_key: [{:system, "AWS_ACCESS_KEY_ID"}, {:awscli, "profile_name", 30}],
  access_key_id: [{:system, "AWS_SECRET_ACCESS_KEY"}, {:awscli, "profile_name", 30}],
  awscli_auth_adapter: ExAws.STS.AuthCache.AssumeRoleWebIdentityAdapter

config :console, :watchers, [
  Console.Watchers.Upgrade,
]

config :console, Console.PromEx,
  metrics_server: [
    port: 9090,
    path: "/metrics", # This is an optional setting and will default to `"/metrics"`
    protocol: :http, # This is an optional setting and will default to `:http`
    pool_size: 5, # This is an optional setting and will default to `5`
    cowboy_opts: [], # This is an optional setting and will default to `[]`
    auth_strategy: :none # This is an optional and will default to `:none`
  ]

config :console,
  prometheus: "http://monitoring-prometheus.monitoring:9090",
  loki: "http://monitoring-loki.monitoring:3100"
