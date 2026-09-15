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
    test "it can create a webhook with policy bindings" do
      reader = insert(:user)
      writer = insert(:user)

      {:ok, %{data: %{"upsertObservabilityWebhook" => webhook}}} = run_query("""
        mutation Upsert($attrs: ObservabilityWebhookAttributes!) {
          upsertObservabilityWebhook(attributes: $attrs) {
            id
            type
            name
            readBindings { user { id } }
            writeBindings { user { id } }
          }
        }
      """, %{"attrs" => %{
        "name" => "webhook",
        "type" => "GRAFANA",
        "readBindings" => [%{"userId" => reader.id}],
        "writeBindings" => [%{"userId" => writer.id}]
      }}, %{current_user: admin_user()})

      assert webhook["name"] == "webhook"
      assert webhook["type"] == "GRAFANA"
      assert [read_binding] = webhook["readBindings"]
      assert [write_binding] = webhook["writeBindings"]
      assert read_binding["user"]["id"] == reader.id
      assert write_binding["user"]["id"] == writer.id
    end

    test "it can update webhook bindings while preserving policy ids" do
      webhook = insert(:observability_webhook)
      reader = insert(:user)
      writer = insert(:user)

      {:ok, %{data: %{"upsertObservabilityWebhook" => updated}}} = run_query("""
        mutation Upsert($attrs: ObservabilityWebhookAttributes!) {
          upsertObservabilityWebhook(attributes: $attrs) {
            id
            readBindings { user { id } }
            writeBindings { user { id } }
          }
        }
      """, %{"attrs" => %{
        "name" => webhook.name,
        "type" => "GRAFANA",
        "readBindings" => [%{"userId" => reader.id}],
        "writeBindings" => [%{"userId" => writer.id}]
      }}, %{current_user: admin_user()})

      assert updated["id"] == webhook.id
      assert [read_binding] = updated["readBindings"]
      assert [write_binding] = updated["writeBindings"]
      assert read_binding["user"]["id"] == reader.id
      assert write_binding["user"]["id"] == writer.id
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

    test "it can create a typed metrics monitor using a named tool" do
      service = insert(:service)
      workbench = insert(:workbench)

      {:ok, %{data: %{"createMonitor" => monitor}}} =
        run_query(
          """
          mutation Create($attrs: MonitorAttributes!) {
            createMonitor(attributes: $attrs) {
              type
              workbench { id }
              query {
                metrics {
                  tool
                  query
                  step
                  duration
                  options {
                    azure { resourceId aggregation }
                  }
                }
              }
            }
          }
          """,
          %{
            "attrs" => %{
              "name" => "request-rate",
              "serviceId" => service.id,
              "workbenchId" => workbench.id,
              "severity" => "HIGH",
              "type" => "METRICS",
              "evaluationCron" => "*/5 * * * *",
              "query" => %{
                "metrics" => %{
                  "tool" => "workbench_observability_metrics_azure",
                  "query" => "requests",
                  "step" => "1m",
                  "duration" => "1h",
                  "options" => %{
                    "azure" => %{"resourceId" => "resource", "aggregation" => "Average"}
                  }
                }
              },
              "threshold" => %{"aggregate" => "MAX", "value" => 10.0}
            }
          },
          %{current_user: admin_user()}
        )

      assert monitor["type"] == "METRICS"
      assert monitor["workbench"]["id"] == workbench.id
      assert monitor["query"]["metrics"]["tool"] ==
               "workbench_observability_metrics_azure"
      assert monitor["query"]["metrics"]["options"]["azure"] == %{
               "resourceId" => "resource",
               "aggregation" => "Average"
             }
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

  describe "dashboard mutations" do
    test "it can create a dashboard with graph and input datasources" do
      workbench = insert(:workbench)

      tool =
        insert(:workbench_tool,
          name: "prom",
          tool: :prometheus,
          categories: [:metrics],
          configuration: %{
            prometheus: %{url: "https://prom.example.com", token: "token", tenant_id: nil}
          }
        )

      insert(:workbench_tool_association, workbench: workbench, tool: tool)

      {:ok, %{data: %{"createDashboard" => dashboard}}} =
        run_query(
          """
          mutation Create($attrs: DashboardAttributes!) {
            createDashboard(attributes: $attrs) {
              id
              name
              graphs {
                identifier
                type
                layout { x y w h }
                datasource { type tool input }
              }
              inputs {
                name
                type
                datasource { type tool input }
              }
            }
          }
          """,
          %{
            "attrs" => %{
              "workbenchId" => workbench.id,
              "name" => "Operations",
              "graphs" => [
                %{
                  "identifier" => "requests",
                  "type" => "TIMESERIES",
                  "layout" => %{"x" => 0, "y" => 0, "w" => 2, "h" => 2},
                  "datasource" => %{
                    "type" => "METRICS",
                    "tool" => "workbench_observability_metrics_prom",
                    "input" => Jason.encode!(%{"query" => "up"})
                  }
                }
              ],
              "inputs" => [
                %{
                  "name" => "namespace",
                  "type" => "SELECT",
                  "datasource" => %{
                    "type" => "LABELS",
                    "tool" => "workbench_observability_metric_label_search_prom",
                    "input" => Jason.encode!(%{"metric" => "kube_pod_info", "label" => "namespace"})
                  }
                }
              ]
            }
          },
          %{current_user: admin_user()}
        )

      assert dashboard["name"] == "Operations"
      assert [graph] = dashboard["graphs"]
      assert graph["datasource"]["type"] == "METRICS"
      assert graph["datasource"]["input"] == %{"query" => "up"}
      assert [input] = dashboard["inputs"]
      assert input["datasource"]["type"] == "LABELS"
    end

    test "it can create a dashboard with a traces graph" do
      workbench = insert(:workbench)

      tool =
        insert(:workbench_tool,
          name: "tempo",
          tool: :tempo,
          categories: [:traces],
          configuration: %{
            tempo: %{url: "https://tempo.example.com", token: "token", tenant_id: nil}
          }
        )

      insert(:workbench_tool_association, workbench: workbench, tool: tool)

      {:ok, %{data: %{"createDashboard" => dashboard}}} =
        run_query(
          """
          mutation Create($attrs: DashboardAttributes!) {
            createDashboard(attributes: $attrs) {
              id
              name
              graphs {
                identifier
                type
                datasource { type tool input }
              }
            }
          }
          """,
          %{
            "attrs" => %{
              "workbenchId" => workbench.id,
              "name" => "Checkout traces",
              "graphs" => [
                %{
                  "identifier" => "checkout",
                  "type" => "TRACES",
                  "layout" => %{"x" => 0, "y" => 0, "w" => 3, "h" => 4},
                  "datasource" => %{
                    "type" => "TRACES",
                    "tool" => "workbench_observability_traces_tempo",
                    "input" => Jason.encode!(%{"query" => "{ service.name = \"checkout\" }"})
                  }
                }
              ]
            }
          },
          %{current_user: admin_user()}
        )

      assert dashboard["name"] == "Checkout traces"
      assert [graph] = dashboard["graphs"]
      assert graph["identifier"] == "checkout"
      assert graph["type"] == "TRACES"
      assert graph["datasource"]["type"] == "TRACES"
      assert graph["datasource"]["tool"] == "workbench_observability_traces_tempo"
      assert graph["datasource"]["input"] == %{"query" => "{ service.name = \"checkout\" }"}
    end

    test "it can update a dashboard" do
      dashboard = insert(:dashboard, graphs: [])

      {:ok, result} =
        run_query(
          """
          mutation Update($id: ID!, $attrs: DashboardAttributes!) {
            updateDashboard(id: $id, attributes: $attrs) {
              id
              name
            }
          }
          """,
          %{"id" => dashboard.id, "attrs" => %{"name" => "Updated"}},
          %{current_user: admin_user()}
        )

      assert result[:errors] == nil
      updated = result.data["updateDashboard"]
      assert updated == %{"id" => dashboard.id, "name" => "Updated"}
    end

    test "it can delete a dashboard" do
      dashboard = insert(:dashboard)

      {:ok, %{data: %{"deleteDashboard" => deleted}}} =
        run_query(
          """
          mutation Delete($id: ID!) {
            deleteDashboard(id: $id) { id }
          }
          """,
          %{"id" => dashboard.id},
          %{current_user: admin_user()}
        )

      assert deleted["id"] == dashboard.id
      refute refetch(dashboard)
    end
  end
end
