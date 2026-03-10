defmodule Console.Deployments.ObservabilityTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Deployments.{Observability, Observability.Webhook}
  alias Console.PubSub
  alias Console.Schema.{WorkbenchWebhook, Monitor}
  alias Console.Logs.AggregationBucket

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
      assert Timex.after?(monitor.next_run_at, monitor.last_run_at)
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
