import Config

config :console, Console.Repo,
  username: "postgres",
  password: "postgres",
  database: "watchman_test",
  hostname: "localhost",
  queue_target: 1000,
  pool: Ecto.Adapters.SQL.Sandbox

config :console, Console.LocalRepo,
  adapter: Ecto.Adapters.SQLite3,
  database: "data/local.db"

config :console, ConsoleWeb.Endpoint,
  http: [port: 4002],
  server: false

config :logger, level: :error

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
  multilevel_cache: Console.MultilevelCache,
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

  pagerduty_webhook_payload: ~s|
{
  "event": {
    "id": "5ac64822-4adc-4fda-ade0-410becf0de4f",
    "event_type": "incident.priority_updated",
    "resource_type": "incident",
    "occurred_at": "2020-10-02T18:45:22.169Z",
    "agent": {
      "html_url": "https://acme.pagerduty.com/users/PLH1HKV",
      "id": "PLH1HKV",
      "self": "https://api.pagerduty.com/users/PLH1HKV",
      "summary": "Tenex Engineer",
      "type": "user_reference"
    },
    "client": {
      "name": "PagerDuty"
    },
    "data": {
      "id": "PGR0VU2",
      "type": "incident",
      "self": "https://api.pagerduty.com/incidents/PGR0VU2",
      "html_url": "https://acme.pagerduty.com/incidents/PGR0VU2",
      "number": 2,
      "status": "triggered",
      "incident_key": "d3640fbd41094207a1c11e58e46b1662",
      "created_at": "2020-04-09T15:16:27Z",
      "service": {
        "html_url": "https://acme.pagerduty.com/services/PF9KMXH",
        "id": "PF9KMXH",
        "self": "https://api.pagerduty.com/services/PF9KMXH",
        "summary": "API Service",
        "type": "service_reference"
      },
      "assignees": [
        {
          "html_url": "https://acme.pagerduty.com/users/PTUXL6G",
          "id": "PTUXL6G",
          "self": "https://api.pagerduty.com/users/PTUXL6G",
          "summary": "User 123",
          "type": "user_reference"
        }
      ],
      "escalation_policy": {
        "html_url": "https://acme.pagerduty.com/escalation_policies/PUS0KTE",
        "id": "PUS0KTE",
        "self": "https://api.pagerduty.com/escalation_policies/PUS0KTE",
        "summary": "Default",
        "type": "escalation_policy_reference"
      },
      "teams": [
        {
          "html_url": "https://acme.pagerduty.com/teams/PFCVPS0",
          "id": "PFCVPS0",
          "self": "https://api.pagerduty.com/teams/PFCVPS0",
          "summary": "Engineering",
          "type": "team_reference"
        }
      ],
      "priority": {
        "html_url": "https://acme.pagerduty.com/account/incident_priorities",
        "id": "PSO75BM",
        "self": "https://api.pagerduty.com/priorities/PSO75BM",
        "summary": "P1",
        "type": "priority_reference"
      },
      "urgency": "high",
      "conference_bridge": {
        "conference_number": "+1 1234123412,,987654321#",
        "conference_url": "https://example.com"
      },
      "resolve_reason": null
    }
  }
}|,

  datadog_webhook_firing_payload: ~s|
{
  "id": "f4c62822-3bdc-4fda-ade0-410becf0de4f",
  "event_type": "incident.priority_updated",
  "resource_type": "incident",
  "occurred_at": "2020-10-02T18:45:22.169Z",
  "title": "Datadog Alert",
  "message": "Datadog Alert Message",
  "link": "https://example.com",
  "url": "https://example.com",
  "status": "firing",
  "priority": "P1",
  "tags": [
    "tag1",
    "tag2",
    "plrl_project:test-project",
    "plrl_cluster:test-cluster",
    "plrl_service:test-service",
    "environment:production"
  ]
}|,

  newrelic_webhook_payload: ~s|
{
	"id": "d1b1f3fd-995a-4066-88ab-8ce4f6960654",
	"issueUrl": "https://radar-api.service.newrelic.com/accounts/1/issues/0ea2df1c-adab-45d2-aae0-042b609d2322?notifier=SLACK",
	"title": "Memory Used % > 90 for at least 2 minutes on 'Some-Entity'",
	"priority": "CRITICAL",
	"impactedEntities": ["logs.itg.cloud","MonitorTTFB query"],
	"totalIncidents": 42,
	"state": "ACTIVATED",
	"trigger": "INCIDENT_ADDED",
	"isCorrelated": false,
	"createdAt": 1617881246260,
	"updatedAt": 1617881246260,
	"sources": ["newrelic"],
	"alertPolicyNames": ["Policy1","Policy2"],
	"alertConditionNames": ["condition1","condition2"],
	"workflowName": "DBA Team workflow",
  "extra_message": "plrl_project: test-project, plrl_cluster: test-cluster, plrl_service: test-service"
}
|,

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

config :elasticsearch,
  host: "http://localhost:9200",
  index: "testindex",
  vector_index: "plrl-vector-testindex",
  aws_access_key_id: "TEST_ACCESS_KEY_ID",
  aws_secret_access_key: "TEST_SECRET_ACCESS_KEY",
  aws_session_token: "TEST_SESSION_TOKEN",
  aws_region: "TEST_REGION"
