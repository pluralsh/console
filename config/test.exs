use Mix.Config

config :console, Console.Repo,
  username: "postgres",
  password: "postgres",
  database: "watchman_test",
  hostname: "localhost",
  pool: Ecto.Adapters.SQL.Sandbox

config :console, ConsoleWeb.Endpoint,
  http: [port: 4002],
  server: false

config :logger, level: :warn

config :goth,
  disabled: true

config :piazza_core, aes_key: "1HdFP1DuK7xkkcEBne41yAwUY8NSfJnYfGVylYYCS2U="

secrets_path = __ENV__.file |> Path.dirname() |> Path.join("secrets")

config :console,
  workspace_root: secrets_path,
  git_url: "git@github.com:michaeljguarino/forge-installations.git",
  repo_root: "forge-installations",
  forge_config: "/Users/michaelguarino/.forge",
  webhook_secret: "webhook_secret",
  piazza_secret: "webhook_secret",
  git_ssh_key: :pass,
  grafana_dns: "grafana.example.com"

config :console, :consumers, [Console.EchoConsumer]

config :kazan, :server, %{url: "kubernetes.default", auth: %{token: "your_token"}}
