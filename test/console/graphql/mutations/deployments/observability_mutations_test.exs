defmodule Console.GraphQl.Deployments.ObservabilityMutationsTest do
  use Console.DataCase, async: true

  describe "upsertObservabilityProvider" do
    test "it can create a provider" do
      {:ok, %{data: %{"upsertObservabilityProvider" => provider}}} = run_query("""
        mutation Upsert($attrs: ObservabilityProviderAttributes!) {
          upsertObservabilityProvider(attributes: $attrs) {
            id
            type
            name
          }
        }
      """, %{"attrs" => %{
        "name" => "provider",
        "type" => "DATADOG",
        "credentials" => %{"datadog" => %{"apiKey" => "api", "appKey" => "app"}}
      }}, %{current_user: admin_user()})

      assert provider["name"] == "provider"
      assert provider["type"] == "DATADOG"
    end
  end

  describe "deleteObservabilityProvider" do
    test "it can delete a provider" do
      provider = insert(:observability_provider)

      {:ok, %{data: %{"deleteObservabilityProvider" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteObservabilityProvider(id: $id) { id }
        }
      """, %{"id" => provider.id}, %{current_user: admin_user()})

      assert deleted["id"] == provider.id
      refute refetch(provider)
    end
  end

  describe "upsertObservabilityWebhook" do
    test "it can create a webhook" do
      {:ok, %{data: %{"upsertObservabilityWebhook" => webhook}}} = run_query("""
        mutation Upsert($attrs: ObservabilityWebhookAttributes!) {
          upsertObservabilityWebhook(attributes: $attrs) {
            id
            type
            name
          }
        }
      """, %{"attrs" => %{
        "name" => "webhook",
        "type" => "GRAFANA"
      }}, %{current_user: admin_user()})

      assert webhook["name"] == "webhook"
      assert webhook["type"] == "GRAFANA"
    end
  end

  describe "deleteObservabilityWebhook" do
    test "it can delete a webhook" do
      webhook = insert(:observability_webhook)

      {:ok, %{data: %{"deleteObservabilityWebhook" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteObservabilityWebhook(id: $id) { id }
        }
      """, %{"id" => webhook.id}, %{current_user: admin_user()})

      assert deleted["id"] == webhook.id
      refute refetch(webhook)
    end
  end

  describe "createAletResolution" do
    test "it can create a resolution for an alert" do
      service = insert(:service)
      alert = insert(:alert, service: service)

      {:ok, %{data: %{"createAlertResolution" => res}}} = run_query("""
        mutation Create($id: ID!, $attrs: AlertResolutionAttributes!) {
          createAlertResolution(id: $id, attributes: $attrs) {
            resolution
            alert { id }
          }
        }
      """, %{"id" => alert.id, "attrs" => %{"resolution" => "resolved"}}, %{current_user: admin_user()})

      assert res["resolution"] == "resolved"
      assert res["alert"]["id"] == alert.id
    end
  end

  describe "createMonitor" do
    test "it can create a monitor" do
      service = insert(:service)

      {:ok, %{data: %{"createMonitor" => monitor}}} =
        run_query(
          """
          mutation Create($attrs: MonitorAttributes!) {
            createMonitor(attributes: $attrs) {
              id
              name
              description
              alertTemplate
              severity
              type
              evaluationCron
              service { id }
              query {
                log {
                  query
                  bucketSize
                  facets {
                    key
                    value
                  }
                }
              }
              threshold {
                aggregate
                value
              }
            }
          }
          """,
          %{
            "attrs" => %{
              "name" => "cpu-high",
              "serviceId" => service.id,
              "description" => "cpu too high",
              "alertTemplate" => "template",
              "severity" => "LOW",
              "type" => "LOG",
              "evaluationCron" => "*/5 * * * *",
              "query" => %{
                "log" => %{
                  "query" => "error",
                  "bucketSize" => "5m",
                  "facets" => [%{"key" => "namespace", "value" => "default"}]
                }
              },
              "threshold" => %{
                "aggregate" => "MAX",
                "value" => 1.0
              }
            }
          },
          %{current_user: admin_user()}
        )

      assert monitor["name"] == "cpu-high"
      assert monitor["service"]["id"] == service.id
      assert monitor["severity"] == "LOW"
      assert monitor["type"] == "LOG"
      assert monitor["evaluationCron"] == "*/5 * * * *"
      assert monitor["query"]["log"]["query"] == "error"
      assert monitor["query"]["log"]["bucketSize"] == "5m"
      assert monitor["threshold"]["aggregate"] == "MAX"
      assert monitor["threshold"]["value"] == 1.0
    end
  end

  describe "updateMonitor" do
    test "it can update a monitor" do
      monitor = insert(:monitor)

      {:ok, %{data: %{"updateMonitor" => updated}}} =
        run_query(
          """
          mutation Update($id: ID!, $attrs: MonitorAttributes!) {
            updateMonitor(id: $id, attributes: $attrs) {
              id
              description
            }
          }
          """,
          %{
            "id" => monitor.id,
            "attrs" => %{
              "name" => monitor.name,
              "serviceId" => monitor.service_id,
              "description" => "updated",
              "alertTemplate" => monitor.alert_template,
              "severity" => monitor.severity |> to_string() |> String.upcase(),
              "type" => monitor.type |> to_string() |> String.upcase(),
              "evaluationCron" => monitor.evaluation_cron,
              "query" => %{
                "log" => %{
                  "query" => monitor.query.log.query,
                  "bucketSize" => monitor.query.log.bucket_size
                }
              },
              "threshold" => %{
                "aggregate" => monitor.threshold.aggregate |> to_string() |> String.upcase(),
                "value" => monitor.threshold.value
              }
            }
          },
          %{current_user: admin_user()}
        )

      assert updated["id"] == monitor.id
      assert updated["description"] == "updated"
    end
  end

  describe "deleteMonitor" do
    test "it can delete a monitor" do
      monitor = insert(:monitor)

      {:ok, %{data: %{"deleteMonitor" => deleted}}} =
        run_query(
          """
          mutation Delete($id: ID!) {
            deleteMonitor(id: $id) {
              id
            }
          }
          """,
          %{"id" => monitor.id},
          %{current_user: admin_user()}
        )

      assert deleted["id"] == monitor.id
      refute refetch(monitor)
    end
  end
end
