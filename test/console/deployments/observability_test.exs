defmodule Console.Deployments.ObservabilityTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Deployments.{Observability, Observability.Webhook}
  alias Console.PubSub
  alias Console.Schema.{WorkbenchWebhook, Monitor}
  alias Console.Logs.AggregationBucket
  alias Console.Deployments.Observability.Monitor, as: MonitorImpl
  alias CloudQuery.Client
  alias Toolquery.ToolQuery.Stub
  alias Toolquery.{
    LogAggregateBucket,
    LogAggregateOutput,
    MetricPoint,
    MetricsQueryOutput
  }

  describe "#upsert_provider/2" do
    test "it can create a new obs provider" do
      {:ok, provider} = Observability.upsert_provider(%{
        type: :datadog,
        name: "provider",
        credentials: %{datadog: %{app_key: "app", api_key: "api"}}
      }, admin_user())

      assert provider.type == :datadog
      assert provider.name == "provider"
      assert provider.credentials.datadog.app_key == "app"
      assert provider.credentials.datadog.api_key == "api"
    end

    test "it can update an existing obs provider" do
      existing = insert(:observability_provider)
      {:ok, provider} = Observability.upsert_provider(%{
        type: :datadog,
        name: existing.name,
        credentials: %{datadog: %{app_key: "app", api_key: "api"}}
      }, admin_user())

      assert provider.id == existing.id
      assert provider.type == :datadog
      assert provider.name == existing.name
      assert provider.credentials.datadog.app_key == "app"
      assert provider.credentials.datadog.api_key == "api"
    end

    test "nonadmins cannot upsert" do
      {:error, _} = Observability.upsert_provider(%{
        type: :datadog,
        name: "provider",
        credentials: %{datadog: %{app_id: "app", api_key: "api"}}
      }, insert(:user))
    end
  end

  describe "#delete_provider/2" do
    test "it can delete a provider by id" do
      provider = insert(:observability_provider)

      {:ok, deleted} = Observability.delete_provider(provider.id, admin_user())

      assert provider.id == deleted.id
      refute refetch(deleted)
    end

    test "nonadmins cannot delete" do
      provider = insert(:observability_provider)

      {:error, _} = Observability.delete_provider(provider.id, insert(:user))
    end
  end

  describe "#upsert_webhook/2" do
    test "it can create a new obs webhook" do
      {:ok, webhook} = Observability.upsert_webhook(%{
        type: :grafana,
        name: "webhook",
      }, admin_user())

      assert webhook.type == :grafana
      assert webhook.name == "webhook"
      assert webhook.external_id
      assert webhook.secret
      assert_receive {:event, %PubSub.ObservabilityWebhookCreated{item: ^webhook}}
    end

    test "it can update an existing obs webhook" do
      existing = insert(:observability_webhook)
      {:ok, webhook} = Observability.upsert_webhook(%{
        type: :grafana,
        name: existing.name,
        secret: "some secret"
      }, admin_user())

      assert webhook.id == existing.id
      assert webhook.type == :grafana
      assert webhook.name == existing.name
      assert webhook.secret == "some secret"
      assert_receive {:event, %PubSub.ObservabilityWebhookUpdated{item: ^webhook}}
    end

    test "nonadmins cannot upsert" do
      {:error, _} = Observability.upsert_webhook(%{
        type: :datadog,
        name: "webhook",
        credentials: %{datadog: %{app_id: "app", api_key: "api"}}
      }, insert(:user))
    end
  end

  describe "#set_resolution/3" do
    test "it can set a resolution for an alert" do
      service = insert(:service)
      alert   = insert(:alert, service: service)

      {:ok, res} = Observability.set_resolution(%{
        resolution: "resolved"
      }, alert.id, admin_user())

      assert res.alert_id   == alert.id
      assert res.resolution == "resolved"
    end

    test "it can update a resolution for an alert" do
      service    = insert(:service)
      alert      = insert(:alert, service: service)
      resolution = insert(:alert_resolution, alert: alert)

      {:ok, res} = Observability.set_resolution(%{
        resolution: "updated"
      }, alert.id, admin_user())

      assert res.id         == resolution.id
      assert res.alert_id   == alert.id
      assert res.resolution == "updated"
    end

    test "non accessible users cannot update alerts" do
      service    = insert(:service)
      alert      = insert(:alert, service: service)

      {:error, _} = Observability.set_resolution(%{resolution: "updated"}, alert.id, insert(:user))
    end
  end

  describe "#delete_webhook/2" do
    test "it can delete a webhook by id" do
      webhook = insert(:observability_webhook)

      {:ok, deleted} = Observability.delete_webhook(webhook.id, admin_user())

      assert webhook.id == deleted.id
      refute refetch(deleted)
      assert_receive {:event, %PubSub.ObservabilityWebhookDeleted{item: ^deleted}}
    end

    test "nonadmins cannot delete" do
      webhook = insert(:observability_webhook)

      {:error, _} = Observability.delete_webhook(webhook.id, insert(:user))
    end
  end

  describe "#payload/2" do
    test "grafana payload gets workbench_id when a matching workbench_webhook exists" do
      obs_webhook = insert(:observability_webhook, type: :grafana)
      workbench = insert(:workbench)
      insert(:workbench_webhook,
        workbench: workbench,
        webhook: obs_webhook,
        name: "grafana-alerts",
        matches: %WorkbenchWebhook.Matches{substring: "High CPU"}
      )

      grafana_payload = %{
        "alerts" => [
          %{
            "labels" => %{"alertname" => "High CPU"},
            "annotations" => %{"summary" => "CPU above 80%"},
            "status" => "firing",
            "fingerprint" => "fp1",
            "generatorURL" => "http://grafana.example/dashboard"
          }
        ],
        "commonLabels" => %{},
        "commonAnnotations" => %{},
        "message" => ""
      }

      {:ok, [alert_data]} = Webhook.payload(obs_webhook, grafana_payload)

      assert alert_data[:workbench_id] == workbench.id
      assert alert_data[:title] == "High CPU"
      assert alert_data[:state] == :firing
    end

    test "alertops payload parses standard alert fields and resolves plural associations" do
      obs_webhook = insert(:observability_webhook, type: :alertops)
      project = insert(:project, name: "test-project")
      cluster = insert(:cluster, handle: "test-cluster")
      service = insert(:service, name: "test-service", cluster: cluster)

      alertops_payload = %{
        "IncidentId" => "AO-123",
        "IncidentSubject" => "Server CPU Alert",
        "IncidentStatus" => "PROBLEM",
        "IncidentSeverity" => "CRITICAL",
        "IncidentURL" => "http://acme.alertops.com/incidents/AO-123",
        "IncidentShortText" => "CPU > 90%",
        "IncidentLongText" => "CPU has been above 90% for 5 minutes",
        "plrl_project" => project.name,
        "plrl_cluster" => cluster.handle,
        "plrl_service" => service.name
      }

      {:ok, [alert_data]} = Webhook.payload(obs_webhook, alertops_payload)

      assert alert_data[:type] == :alertops
      assert alert_data[:fingerprint] == "AO-123"
      assert alert_data[:title] == "Server CPU Alert"
      assert alert_data[:state] == :firing
      assert alert_data[:severity] == :critical
      assert alert_data[:url] == "http://acme.alertops.com/incidents/AO-123"
      assert alert_data[:message] =~ "CPU has been above 90% for 5 minutes"
      assert alert_data[:project_id] == project.id
      assert alert_data[:cluster_id] == cluster.id
      assert alert_data[:service_id] == service.id
    end

    test "alertops payload with OK IncidentStatus resolves the alert" do
      obs_webhook = insert(:observability_webhook, type: :alertops)

      {:ok, [alert_data]} =
        Webhook.payload(obs_webhook, %{
          "IncidentId" => "AO-9",
          "IncidentSubject" => "Recovered",
          "IncidentStatus" => "OK",
          "IncidentSeverity" => "CRITICAL"
        })

      assert alert_data[:state] == :resolved
      assert alert_data[:severity] == :critical
    end
  end

  describe "#create_monitor/3" do
    test "admin can create a monitor" do
      service = insert(:service)

      {:ok, %Monitor{} = monitor} =
        Observability.create_monitor(%{
          name: "cpu-high",
          service_id: service.id,
          description: "cpu too high",
          alert_template: "template",
          severity: :low,
          type: :log,
          query: %{log: %{query: "error", bucket_size: "5m"}},
          threshold: %{aggregate: :max, value: 1},
          evaluation_cron: "*/5 * * * *"
        }, admin_user())

      assert monitor.service_id == service.id
      assert monitor.query.log.query == "error"
      assert monitor.query.log.bucket_size == "5m"
      assert monitor.query.log.facets == []
      assert monitor.threshold.value == 1
      assert monitor.threshold.aggregate == :max
      assert monitor.evaluation_cron == "*/5 * * * *"
      assert monitor.next_run_at
    end

    test "user without service read access cannot create a monitor" do
      service = insert(:service)
      user = insert(:user)

      {:error, _} =
        Observability.create_monitor(%{
          name: "cpu-high",
          service_id: service.id,
          description: "cpu too high",
          alert_template: "template",
          severity: :low,
          type: :log,
          threshold: %{"value" => 1},
          evaluation_cron: "*/5 * * * *"
        }, user)
    end

    test "user with service read access can create a monitor" do
      user = insert(:user)
      service = insert(:service, read_bindings: [%{user_id: user.id}])

      {:ok, %Monitor{} = monitor} =
        Observability.create_monitor(%{
          name: "cpu-high",
          service_id: service.id,
          description: "cpu too high",
          alert_template: "template",
          severity: :low,
          type: :log,
          query: %{log: %{query: "error", bucket_size: "5m"}},
          threshold: %{aggregate: :max, value: 1},
          evaluation_cron: "*/5 * * * *"
        }, user)

      assert monitor.service_id == service.id
    end
  end

  describe "#update_monitor/3" do
    test "admin can update a monitor" do
      monitor = insert(:monitor)

      {:ok, %Monitor{} = updated} =
        Observability.update_monitor(%{description: "updated"}, monitor.id, admin_user())

      assert updated.description == "updated"
    end

    test "user without service read access cannot update monitor" do
      service = insert(:service)
      monitor = insert(:monitor, service: service)
      user = insert(:user)

      {:error, _} =
        Observability.update_monitor(%{description: "updated"}, monitor.id, user)
    end

    test "user with service read access can update monitor" do
      user = insert(:user)
      service = insert(:service, read_bindings: [%{user_id: user.id}])
      monitor = insert(:monitor, service: service)

      {:ok, %Monitor{} = updated} =
        Observability.update_monitor(%{description: "updated"}, monitor.id, user)

      assert updated.description == "updated"
    end
  end

  describe "#delete_monitor/2" do
    test "admin can delete a monitor" do
      monitor = insert(:monitor)

      {:ok, %Monitor{} = deleted} = Observability.delete_monitor(monitor.id, admin_user())

      assert deleted.id == monitor.id
      refute refetch(monitor)
    end

    test "user without service read access cannot delete monitor" do
      service = insert(:service)
      monitor = insert(:monitor, service: service)

      {:error, _} = Observability.delete_monitor(monitor.id, insert(:user))
    end

    test "user with service read access can delete monitor" do
      user = insert(:user)
      service = insert(:service, read_bindings: [%{user_id: user.id}])
      monitor = insert(:monitor, service: service)

      {:ok, %Monitor{} = deleted} = Observability.delete_monitor(monitor.id, user)
      assert deleted.id == monitor.id
      refute refetch(monitor)
    end
  end

  describe "#run_monitor/1" do
    test "evaluates a native metrics query" do
      deployment_settings(
        prometheus_connection: %{
          host: "https://prom.example.com",
          user: "user",
          password: "password"
        }
      )

      monitor =
        insert(:monitor,
          type: :metrics,
          threshold: %{aggregate: :max, value: 1.0},
          query: %{metrics: %{query: "up", step: "1m", duration: "10m"}}
        )

      timestamp = DateTime.utc_now()
      expect(Client, :connect, fn -> {:ok, :mock_conn} end)

      expect(Stub, :metrics, fn :mock_conn, input, _opts ->
        assert input.query == "up"
        assert input.step == "1m"

        {:ok,
         %MetricsQueryOutput{
           metrics: [
             %MetricPoint{
               timestamp: Google.Protobuf.from_datetime(timestamp),
               name: "up",
               value: 2.0
             }
           ]
         }}
      end)

      assert {:ok, :firing, [%{count: 2.0, timestamp: result_timestamp}]} =
               MonitorImpl.query(monitor)

      assert DateTime.compare(result_timestamp, timestamp) == :eq
    end

    test "evaluates a named metrics tool query" do
      user = insert(:user, roles: %{admin: true})
      workbench = insert(:workbench)

      tool =
        insert(:workbench_tool,
          project: workbench.project,
          name: "prom",
          tool: :prometheus,
          categories: [:metrics],
          configuration: %{
            prometheus: %{url: "https://prom.example.com", token: "token", tenant_id: nil}
          }
        )

      insert(:workbench_tool_association, workbench: workbench, tool: tool)

      monitor =
        insert(:monitor,
          type: :metrics,
          workbench: workbench,
          user: user,
          threshold: %{aggregate: :avg, value: 2.0},
          query: %{
            metrics: %{
              tool: "workbench_observability_metrics_prom",
              query: "rate(requests[5m])",
              step: "30s",
              duration: "10m"
            }
          }
        )
        |> Console.Repo.preload([:workbench, :user])

      timestamp = DateTime.utc_now()
      expect(Client, :connect, fn -> {:ok, :mock_conn} end)

      expect(Stub, :metrics, fn :mock_conn, input, _opts ->
        assert input.query == "rate(requests[5m])"
        assert input.step == "30s"

        {:ok,
         %MetricsQueryOutput{
           metrics: [
             %MetricPoint{
               timestamp: Google.Protobuf.from_datetime(timestamp),
               name: "requests",
               value: 3.0
             }
           ]
         }}
      end)

      assert {:ok, :firing, [%{count: 3.0}]} = MonitorImpl.query(monitor)
    end

    test "rejects a named monitor query denied by workbench policy" do
      user = insert(:user, roles: %{admin: true})
      workbench = insert(:workbench)

      tool =
        insert(:workbench_tool,
          project: workbench.project,
          name: "prom",
          tool: :prometheus,
          categories: [:metrics],
          configuration: %{
            prometheus: %{url: "https://prom.example.com", token: "token", tenant_id: nil}
          }
        )

      insert(:workbench_tool_association, workbench: workbench, tool: tool)

      policy =
        insert(:policy,
          project: workbench.project,
          policy: """
          package plrl.wb.admission
          sample := 0
          deny[{"message": "monitor query blocked"}] if {
            input.tool_name == "workbench_observability_metrics_prom"
          }
          """
        )

      insert(:workbench_policy,
        workbench: workbench,
        policy: policy,
        matches: %{regexes: ["^workbench_observability_metrics_prom$"]}
      )

      monitor =
        insert(:monitor,
          type: :metrics,
          workbench: workbench,
          user: user,
          query: %{
            metrics: %{
              tool: "workbench_observability_metrics_prom",
              query: "up",
              duration: "10m"
            }
          }
        )
        |> Console.Repo.preload([:workbench, :user])

      reject(&Client.connect/0)

      assert {:error, message} = MonitorImpl.query(monitor)
      assert message =~ "Policy denied"
    end

    test "evaluates a named logs tool with server-side aggregation" do
      user = insert(:user, roles: %{admin: true})
      workbench = insert(:workbench)

      tool =
        insert(:workbench_tool,
          project: workbench.project,
          name: "loki",
          tool: :loki,
          categories: [:logs],
          configuration: %{loki: %{url: "https://loki.example.com"}}
        )

      insert(:workbench_tool_association, workbench: workbench, tool: tool)

      monitor =
        insert(:monitor,
          workbench: workbench,
          user: user,
          threshold: %{aggregate: :max, value: 4.0},
          query: %{
            log: %{
              tool: "workbench_observability_log_aggregate_loki",
              query: "{namespace=\"prod\"}",
              bucket_size: "5m",
              duration: "10m",
              operator: :and,
              facets: [%{key: "pod", value: "api"}]
            }
          }
        )
        |> Console.Repo.preload([:workbench, :user])

      timestamp = DateTime.utc_now()
      expect(Client, :connect, fn -> {:ok, :mock_conn} end)

      expect(Stub, :log_aggregate, fn :mock_conn, input, _opts ->
        assert input.query == "{namespace=\"prod\"}"
        assert input.bucket_size == "5m"
        assert input.operator == :LOG_QUERY_OPERATOR_AND
        assert [%{name: "pod", value: "api"}] = input.facets

        {:ok,
         %LogAggregateOutput{
           buckets: [
             %LogAggregateBucket{
               timestamp: Google.Protobuf.from_datetime(timestamp),
               count: 5
             }
           ]
         }}
      end)

      assert {:ok, :firing, [%{count: 5}]} = MonitorImpl.query(monitor)
    end

    test "creates a firing alert when monitor is firing and no existing alert" do
      service = insert(:service)

      monitor =
        insert(:monitor,
          service: service,
          name: "cpu-high",
          alert_template: "Monitor {{ monitor.name }} is firing for {{ monitor.service.name }}",
          threshold: %{aggregate: :max, value: 1.0},
          query: %{log: %{query: "error", bucket_size: "5m", duration: "10m", facets: []}}
        )

      expect(Console.Logs.Provider, :aggregate, fn _query ->
        {:ok, [%AggregationBucket{count: 5.0, timestamp: DateTime.utc_now()}]}
      end)

      {:ok, alert} = Observability.run_monitor(refetch(monitor))

      assert alert.state == :firing
      assert alert.monitor_id == monitor.id
      assert alert.fingerprint == monitor.id
      assert alert.severity == monitor.severity
      assert alert.service_id == service.id
      assert alert.state_changed
      assert alert.timeseries.threshold == 1.0
      assert length(alert.timeseries.metrics) == 1

      assert alert.message == "Monitor cpu-high is firing for #{service.name}"

      assert refetch(monitor).state == :firing
    end

    test "creates a firing alert when alert templates are unused" do
      service = insert(:service)

      monitor =
        insert(:monitor,
          service: service,
          name: "cpu-high",
          threshold: %{aggregate: :max, value: 1.0},
          query: %{log: %{query: "error", bucket_size: "5m", duration: "10m", facets: []}}
        )

      expect(Console.Logs.Provider, :aggregate, fn _query ->
        {:ok, [%AggregationBucket{count: 5.0, timestamp: DateTime.utc_now()}]}
      end)

      {:ok, alert} = Observability.run_monitor(refetch(monitor))

      assert alert.state == :firing
      assert alert.monitor_id == monitor.id
      assert alert.fingerprint == monitor.id
      assert alert.severity == monitor.severity
      assert alert.service_id == service.id
      assert alert.state_changed
      assert alert.timeseries.threshold == 1.0
      assert length(alert.timeseries.metrics) == 1
      assert is_binary(alert.message)
    end

    test "resolves an existing alert when monitor is no longer firing" do
      service = insert(:service)

      monitor =
        insert(:monitor,
          service: service,
          name: "cpu-high",
          alert_template: "Monitor {{ monitor.name }}",
          threshold: %{aggregate: :max, value: 5.0},
          query: %{log: %{query: "error", bucket_size: "5m", duration: "10m", facets: []}}
        )

      alert =
        insert(:alert,
          monitor: monitor,
          service: service,
          state: :firing,
          fingerprint: monitor.id
        )

      expect(Console.Logs.Provider, :aggregate, fn _query ->
        {:ok, [%AggregationBucket{count: 0.0, timestamp: DateTime.utc_now()}]}
      end)

      {:ok, resolved} = Observability.run_monitor(refetch(monitor))

      assert resolved.id == alert.id
      assert resolved.state == :resolved
      assert resolved.fingerprint == monitor.id
    end

    test "ignores a non-firing monitor with no existing alert" do
      service = insert(:service)

      monitor =
        insert(:monitor,
          service: service,
          name: "cpu-high",
          alert_template: "Monitor {{ context.monitor.name }}",
          threshold: %{aggregate: :max, value: 5.0},
          query: %{log: %{query: "error", bucket_size: "5m", duration: "10m", facets: []}}
        )

      expect(Console.Logs.Provider, :aggregate, fn _query ->
        {:ok, [%{count: 0.0}]}
      end)

      assert :ignore == Observability.run_monitor(refetch(monitor))
    end

    test "overwrites an existing resolved alert when monitor is firing again" do
      service = insert(:service)

      monitor =
        insert(:monitor,
          service: service,
          name: "cpu-high",
          alert_template: "Monitor {{ monitor.name }} back to firing for {{ monitor.service.name }}",
          threshold: %{aggregate: :max, value: 1.0},
          query: %{log: %{query: "error", bucket_size: "5m", duration: "10m", facets: []}}
        )

      alert =
        insert(:alert,
          monitor: monitor,
          service: service,
          state: :resolved,
          fingerprint: monitor.id,
          message: "old message"
        )

      expect(Console.Logs.Provider, :aggregate, fn _query ->
        {:ok, [%AggregationBucket{count: 10.0, timestamp: DateTime.utc_now()}]}
      end)

      {:ok, firing} = Observability.run_monitor(refetch(monitor))

      assert firing.id == alert.id
      assert firing.state == :firing
      assert firing.fingerprint == monitor.id

      assert firing.message ==
               "Monitor cpu-high back to firing for #{service.name}"
    end
  end
end
