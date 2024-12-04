import Config

config :console, Console.Repo,
  username: "postgres",
  password: "postgres",
  database: "watchman_test",
  hostname: "localhost",
  queue_target: 1000,
  pool: Ecto.Adapters.SQL.Sandbox

config :console, ConsoleWeb.Endpoint,
  http: [port: 4002],
  server: false

config :logger, level: :warning

config :goth,
  disabled: true

config :piazza_core, aes_key: "1HdFP1DuK7xkkcEBne41yAwUY8NSfJnYfGVylYYCS2U="


secrets_path = __ENV__.file |> Path.dirname() |> Path.join("secrets")
binfile = fn p ->
  __ENV__.file
  |> Path.dirname()
  |> Path.dirname()
  |> Path.join("bin")
  |> Path.join(p)
end

config :console,
  workspace_root: secrets_path,
  git_url: "git@github.com:michaeljguarino/forge-installations.git",
  repo_root: "forge-installations",
  forge_config: "/Users/michaelguarino/.forge",
  webhook_secret: "webhook_secret",
  piazza_secret: "webhook_secret",
  git_askpass: binfile.(".git-askpass"),
  ssh_askpass: binfile.(".ssh-askpass"),
  admin_emails: ["admin@example.com"],
  git_ssh_key: :pass,
  cache_adapter: Console.TestCache,
  local_cache: Console.TestCache,
  grafana_dns: "grafana.example.com",
  prom_plugins: []

config :console, :login_link,
  key: "test-key",
  email: "sandbox@plural.sh"

config :console, :consumers, [Console.EchoConsumer]

config :kazan, :server, %{url: "kubernetes.default", auth: %{token: "your_token"}}

config :console,
  grafana_webhook_payload: ~s|
{
  "receiver": "My Super Webhook",
  "status": "firing",
  "orgId": 1,
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "High memory usage",
        "team": "blue",
        "zone": "us-1"
      },
      "annotations": {
        "description": "The system has high memory usage",
        "runbook_url": "https://myrunbook.com/runbook/1234",
        "summary": "This alert was triggered for zone us-1"
      },
      "startsAt": "2021-10-12T09:51:03.157076+02:00",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "https://play.grafana.org/alerting/1afz29v7z/edit",
      "fingerprint": "c6eadffa33fcdf37",
      "silenceURL": "https://play.grafana.org/alerting/silence/new?alertmanager=grafana&matchers=alertname%3DT2%2Cteam%3Dblue%2Czone%3Dus-1",
      "dashboardURL": "",
      "panelURL": "",
      "values": {
        "B": 44.23943737541908,
        "C": 1
      }
    },
    {
      "status": "firing",
      "labels": {
        "alertname": "High CPU usage",
        "team": "blue",
        "zone": "eu-1"
      },
      "annotations": {
        "description": "The system has high CPU usage",
        "runbook_url": "https://myrunbook.com/runbook/1234",
        "summary": "This alert was triggered for zone eu-1"
      },
      "startsAt": "2021-10-12T09:56:03.157076+02:00",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "https://play.grafana.org/alerting/d1rdpdv7k/edit",
      "fingerprint": "bc97ff14869b13e3",
      "silenceURL": "https://play.grafana.org/alerting/silence/new?alertmanager=grafana&matchers=alertname%3DT1%2Cteam%3Dblue%2Czone%3Deu-1",
      "dashboardURL": "",
      "panelURL": "",
      "values": {
        "B": 44.23943737541908,
        "C": 1
      }
    }
  ],
  "groupLabels": {},
  "commonLabels": {
    "team": "blue"
  },
  "commonAnnotations": {},
  "externalURL": "https://play.grafana.org/",
  "version": "1",
  "groupKey": "{}:{}",
  "truncatedAlerts": 0,
  "title": "[FIRING:2]  (blue)",
  "state": "alerting",
  "message": "**Firing** blah blah blah"
}|,
  test_kubeconfig: """
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: DUMMY_CERT
    server: https://my.kubernetes.endpoint
  name: test-cluster
contexts:
- context:
    cluster: test-cluster
    user: test-cluster-user
  name: test-cluster-user
current-context: test-cluster-user
kind: Config
preferences: {}
users:
- name: test-cluster-user
  user:
    token: TEST
"""

config :console, Console.Mailer,
  adapter: Bamboo.TestAdapter

config :console, Console.Deployments.Metrics.Provider.NewRelic,
  plug: {Req.Test, Console.Deployments.Metrics.Provider.NewRelic}

config :bamboo, :refute_timeout, 10
