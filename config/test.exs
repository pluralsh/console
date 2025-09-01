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
  prom_plugins: [],
  github_app_id: "1234567890"
  # github_app_pem: priv_string

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
  sentry_webhook_payload: ~s|
{
  "action": "triggered",
  "actor": {
    "id": "sentry",
    "name": "Sentry",
    "type": "application"
  },
  "data": {
    "event": {
      "_ref": 1,
      "_ref_version": 2,
      "contexts": {
        "browser": {
          "name": "Chrome",
          "type": "browser",
          "version": "75.0.3770"
        },
        "os": {
          "name": "Mac OS X",
          "type": "os",
          "version": "10.14.0"
        }
      },
      "culprit": "?(<anonymous>)",
      "datetime": "2019-08-19T21:06:17.677000Z",
      "dist": null,
      "event_id": "e4874d664c3540c1a32eab185f12c5ab",
      "exception": {
        "values": [
          {
            "mechanism": {
              "data": {
                "message": "heck is not defined",
                "mode": "stack",
                "name": "ReferenceError"
              },
              "description": null,
              "handled": false,
              "help_link": null,
              "meta": null,
              "synthetic": null,
              "type": "onerror"
            },
            "stacktrace": {
              "frames": [
                {
                  "abs_path": "https://static.jsbin.com/js/prod/runner-4.1.7.min.js",
                  "colno": 10866,
                  "context_line": "blah blah blah",
                  "data": {
                    "orig_in_app": 1
                  },
                  "errors": null,
                  "filename": "/js/prod/runner-4.1.7.min.js",
                  "function": null,
                  "image_addr": null,
                  "in_app": false,
                  "instruction_addr": null,
                  "lineno": 1,
                  "module": "prod/runner-4.1.7",
                  "package": null,
                  "platform": null,
                  "post_context": null,
                  "pre_context": null,
                  "raw_function": null,
                  "symbol": null,
                  "symbol_addr": null,
                  "trust": null,
                  "vars": null
                },
                {
                  "abs_path": "https://static.jsbin.com/js/prod/runner-4.1.7.min.js",
                  "colno": 13924,
                  "context_line": "blah blah blah",
                  "data": {
                    "orig_in_app": 1
                  },
                  "errors": null,
                  "filename": "/js/prod/runner-4.1.7.min.js",
                  "function": null,
                  "image_addr": null,
                  "in_app": false,
                  "instruction_addr": null,
                  "lineno": 1,
                  "module": "prod/runner-4.1.7",
                  "package": null,
                  "platform": null,
                  "post_context": null,
                  "pre_context": null,
                  "raw_function": null,
                  "symbol": null,
                  "symbol_addr": null,
                  "trust": null,
                  "vars": null
                },
                {
                  "abs_path": "<anonymous>",
                  "colno": 5,
                  "context_line": null,
                  "data": {
                    "orig_in_app": 1
                  },
                  "errors": null,
                  "filename": "<anonymous>",
                  "function": null,
                  "image_addr": null,
                  "in_app": false,
                  "instruction_addr": null,
                  "lineno": 3,
                  "module": null,
                  "package": null,
                  "platform": null,
                  "post_context": null,
                  "pre_context": null,
                  "raw_function": null,
                  "symbol": null,
                  "symbol_addr": null,
                  "trust": null,
                  "vars": null
                }
              ]
            },
            "type": "ReferenceError",
            "value": "heck is not defined"
          }
        ]
      },
      "fingerprint": ["{{ default }}"],
      "grouping_config": {
        "enhancements": "eJybzDhxY05qemJypZWRgaGlroGxrqHRBABbEwcC",
        "id": "legacy:2019-03-12"
      },
      "hashes": ["29f7ffc4903a8a990408b80a3b4c95a2"],
      "issue_url": "https://sentry.io/api/0/issues/1117540176/",
      "issue_id": "1117540176",
      "key_id": "667532",
      "level": "error",
      "location": "<anonymous>",
      "logger": "",
      "message": "",
      "metadata": {
        "filename": "<anonymous>",
        "type": "ReferenceError",
        "value": "heck is not defined"
      },
      "platform": "javascript",
      "project": 1,
      "received": 1566248777.677,
      "release": null,
      "request": {
        "cookies": null,
        "data": null,
        "env": null,
        "fragment": null,
        "headers": [
          [
            "User-Agent",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36"
          ]
        ],
        "inferred_content_type": null,
        "method": null,
        "query_string": [],
        "url": "https://null.jsbin.com/runner"
      },
      "sdk": {
        "integrations": [
          "InboundFilters",
          "FunctionToString",
          "BrowserApiErrors",
          "Breadcrumbs",
          "GlobalHandlers",
          "LinkedErrors",
          "HttpContext"
        ],
        "name": "sentry.javascript.browser",
        "packages": [
          {
            "name": "npm:@sentry/browser",
            "version": "5.5.0"
          }
        ],
        "version": "5.5.0"
      },
      "tags": [
        ["browser", "Chrome 75.0.3770"],
        ["browser.name", "Chrome"],
        ["handled", "no"],
        ["level", "error"],
        ["mechanism", "onerror"],
        ["os", "Mac OS X 10.14.0"],
        ["os.name", "Mac OS X"],
        ["user", "ip:162.217.75.90"],
        ["url", "https://null.jsbin.com/runner"],
        ["plrl.flow", "test-flow"]
      ],
      "time_spent": null,
      "timestamp": 1566248777.677,
      "title": "ReferenceError: heck is not defined",
      "type": "error",
      "url": "https://sentry.io/api/0/projects/test-org/front-end/events/e4874d664c3540c1a32eab185f12c5ab/",
      "user": {
        "ip_address": "162.218.85.90"
      },
      "version": "7",
      "web_url": "https://sentry.io/organizations/test-org/issues/1117540176/events/e4874d664c3540c1a32eab185f12c5ab/"
    },
    "triggered_rule": "Very Important Alert Rule!",
    "issue_alert": {
      "title": "Very Important Alert Rule!",
      "settings": [
        {
          "name": "channel",
          "value": "#general"
        }
      ]
    }
  },
  "installation": {
    "uuid": "a8e5d37a-696c-4c54-adb5-b3f28d64c7de"
  }
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
  vector_index: "plrl-vector-testindex"

config :opensearch,
  # create-domain endpoint done through localstack is always in format http://<domain>.<region>.opensearch.localhost.localstack.cloud:<localstack-port>
  host: "http://opensearch-local.us-east-1.opensearch.localhost.localstack.cloud:4566",
  index: "plrl-testindex",
  vector_index: "plrl-vector-testindex",
  # aws access key id, secret access key, session token must be the same values as in Makefile
  aws_access_key_id: "test-access-key",
  aws_secret_access_key: "test-secret-key",
  aws_session_token: "test-session-token",
  aws_region: "us-east-1"
