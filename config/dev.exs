use Mix.Config

config :console, :initialize, true

config :console, Console.Repo,
  username: "postgres",
  password: "postgres",
  database: "forge_dev",
  hostname: "localhost",
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

config :console, ConsoleWeb.Endpoint,
  http: [port: 4003],
  debug_errors: true,
  code_reloader: true,
  check_origin: false
  # watchers: [
  #   node: [
  #     "node_modules/react-scripts/bin/react-scripts.js",
  #     "start",
  #     cd: Path.expand("../apps/watchman/assets", __DIR__)
  #   ]
  # ]

secrets_path = Path.expand("../secrets", __DIR__)

config :console,
  workspace_root: secrets_path,
  git_url: "git@github.com:michaeljguarino/forge-installations.git",
  repo_root: "forge-installations",
  forge_config: "/Users/michaelguarino/.forge",
  webhook_secret: "webhook_secret",
  git_ssh_key: :pass

config :console, ConsoleWeb.Endpoint,
  live_reload: [
    patterns: [
      ~r"priv/static/.*(js|css|png|jpeg|jpg|gif|svg)$",
      ~r"priv/gettext/.*(po)$",
      ~r"lib/api_web/{live,views}/.*(ex)$",
      ~r"lib/api_web/templates/.*(eex)$"
    ]
  ]

config :logger, :console, format: "[$level] $message\n"

config :phoenix, :stacktrace_depth, 20

config :phoenix, :plug_init_mode, :runtime
