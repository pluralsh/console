defmodule Console.GraphQl.Deployments.ObservabilityQueriesTest do
  use Console.DataCase, async: true
  use Mimic

  alias CloudQuery.Client
  alias Toolquery.ToolQuery.Stub
  alias Toolquery.{
    LogEntry,
    LogsQueryOutput,
    MetricPoint,
    MetricsLabelSearchOutput,
    MetricsLabelSearchResult,
    MetricsQueryOutput
  }
  alias Console.Schema.Dashboard

  describe "observabilityProvider" do
    test "it can fetch a provider" do
      provider = insert(:observability_provider)

      {:ok, %{data: %{"observabilityProvider" => found}}} = run_query("""
        query Provider($id: ID!) {
          observabilityProvider(id: $id) { id name type }
        }
      """, %{"id" => provider.id}, %{current_user: insert(:user)})

      assert found["id"] == provider.id
      assert found["type"] == "DATADOG"
      assert found["name"] == provider.name
    end
  end

  describe "observabilityProviders" do
    test "it can list providers" do
      providers = insert_list(3, :observability_provider)

      {:ok, %{data: %{"observabilityProviders" => found}}} = run_query("""
        query {
          observabilityProviders(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(providers)
    end
  end

  describe "observabilityWebhooks" do
    test "it lists only observability webhooks accessible to the current user" do
      user = insert(:user)
      allowed = insert(:observability_webhook, read_bindings: [%{user_id: user.id}])
      _denied = insert(:observability_webhook)

      {:ok, %{data: %{"observabilityWebhooks" => found}}} = run_query("""
        query {
          observabilityWebhooks(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([allowed])
    end
  end

  describe "monitor" do
    test "it can fetch a monitor by id" do
      monitor = insert(:monitor)

      {:ok, %{data: %{"monitor" => found}}} = run_query("""
        query Monitor($id: ID!) {
          monitor(id: $id) {
            id
            name
            threshold {
              aggregate
              value
            }
          }
        }
      """, %{"id" => monitor.id}, %{current_user: admin_user()})

      assert found["id"] == monitor.id
      assert found["name"] == monitor.name
      assert found["threshold"]["aggregate"] == "MAX"
      assert found["threshold"]["value"] == 1.0
    end
  end

  describe "serviceDeployment monitors" do
    test "it can search monitors by name" do
      service = insert(:service)
      m1 = insert(:monitor, name: "cpu-high", service: service)
      _m2 = insert(:monitor, name: "mem-high", service: service)

      {:ok, %{data: %{"serviceDeployment" => %{"monitors" => found}}}} = run_query("""
        query Monitors($id: ID!, $q: String) {
          serviceDeployment(id: $id) {
            monitors(first: 10, q: $q) {
              edges { node { id name } }
            }
          }
        }
      """, %{"id" => service.id, "q" => "cpu"}, %{current_user: admin_user()})

      monitors = from_connection(found)
      assert length(monitors) == 1
      assert hd(monitors)["id"] == m1.id
    end
  end

  describe "workbenchDashboard" do
    test "it can fetch a dashboard by id" do
      dashboard = insert(:dashboard)

      {:ok, %{data: %{"workbenchDashboard" => found}}} =
        run_query(
          """
          query Dashboard($id: ID!) {
            workbenchDashboard(id: $id) {
              id
              name
              graphs {
                identifier
                datasource { type tool input }
              }
            }
          }
          """,
          %{"id" => dashboard.id},
          %{current_user: admin_user()}
        )

      assert found["id"] == dashboard.id
      assert found["name"] == dashboard.name
      assert [graph] = found["graphs"]
      assert graph["datasource"]["type"] == "METRICS"
    end
  end

  describe "workbench dashboards" do
    test "it lists dashboards through their workbench" do
      workbench = insert(:workbench)
      dashboards = insert_list(2, :dashboard, workbench: workbench)
      _other = insert(:dashboard)

      {:ok, %{data: %{"workbench" => %{"workbenchDashboards" => found}}}} =
        run_query(
          """
          query Workbench($id: ID!) {
            workbench(id: $id) {
              workbenchDashboards(first: 5) {
                edges { node { id name } }
              }
            }
          }
          """,
          %{"id" => workbench.id},
          %{current_user: admin_user()}
        )

      assert found
             |> from_connection()
             |> ids_equal(dashboards)
    end
  end

  describe "dashboard datasource fields" do
    test "fetches graph metrics and input labels with substituted variables and time ranges" do
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

      dashboard =
        insert(:dashboard,
          workbench: workbench,
          graphs: [
            %Dashboard.Graph{
              identifier: "requests",
              type: :timeseries,
              layout: %Dashboard.Graph.Layout{x: 0, y: 0, w: 2, h: 2},
              datasource: %Dashboard.Datasource{
                type: :metrics,
                tool: "workbench_observability_metrics_prom",
                input: %{
                  "query" => "sum(rate(http_requests_total{namespace=\"${namespace}\"}[5m]))",
                  "step" => "30s"
                }
              }
            }
          ],
          inputs: [
            %Dashboard.Input{
              name: "namespace",
              type: :select,
              datasource: %Dashboard.Datasource{
                type: :labels,
                tool: "workbench_observability_metric_label_search_prom",
                input: %{"metric" => "kube_pod_info", "label" => "${label}"}
              }
            }
          ]
        )

      start_at = ~U[2026-09-07 21:00:00Z]
      end_at = ~U[2026-09-07 22:00:00Z]

      expect(Client, :connect, 2, fn -> {:ok, :mock_conn} end)

      expect(Stub, :metrics, fn :mock_conn, input, opts ->
        assert opts[:timeout] == :timer.seconds(30)
        assert input.query == "sum(rate(http_requests_total{namespace=\"production\"}[5m]))"
        assert DateTime.compare(Google.Protobuf.to_datetime(input.range.start), start_at) == :eq
        assert DateTime.compare(Google.Protobuf.to_datetime(input.range.end), end_at) == :eq

        {:ok,
         %MetricsQueryOutput{
           metrics: [
             %MetricPoint{
               timestamp: Google.Protobuf.from_datetime(end_at),
               name: "http_requests_total",
               value: 42.0,
               labels: %{"namespace" => "production"}
             }
           ]
         }}
      end)

      expect(Stub, :metrics_label_search, fn :mock_conn, input, opts ->
        assert opts[:timeout] == :timer.seconds(30)
        assert input.metric == "kube_pod_info"
        assert input.label == "namespace"

        {:ok,
         %MetricsLabelSearchOutput{
           results: [
             %MetricsLabelSearchResult{name: "production"},
             %MetricsLabelSearchResult{name: "staging"}
           ]
         }}
      end)

      {:ok, %{data: %{"workbenchDashboard" => found}}} =
        run_query(
          """
          query Dashboard($id: ID!, $input: Json!, $timeRange: DashboardTimeRangeAttributes!) {
            workbenchDashboard(id: $id) {
              graphData: graph(identifier: "requests", input: $input, timeRange: $timeRange) {
                metrics { timestamp name value labels }
                logs { timestamp message labels }
              }
              inputValues: input(identifier: "namespace", input: $input, timeRange: $timeRange)
            }
          }
          """,
          %{
            "id" => dashboard.id,
            "input" => Jason.encode!(%{"namespace" => "production", "label" => "namespace"}),
            "timeRange" => %{
              "start" => DateTime.to_iso8601(start_at),
              "end" => DateTime.to_iso8601(end_at)
            }
          },
          %{current_user: admin_user()}
        )

      assert [metric] = found["graphData"]["metrics"]
      assert metric["name"] == "http_requests_total"
      assert metric["value"] == 42.0
      assert metric["labels"] == %{"namespace" => "production"}
      assert found["graphData"]["logs"] == nil
      assert found["inputValues"] == ["production", "staging"]
    end

    test "fetches typed log results for log graphs" do
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

      dashboard =
        insert(:dashboard,
          workbench: workbench,
          graphs: [
            %Dashboard.Graph{
              identifier: "errors",
              type: :logs,
              layout: %Dashboard.Graph.Layout{x: 0, y: 0, w: 2, h: 2},
              datasource: %Dashboard.Datasource{
                type: :logs,
                tool: "workbench_observability_logs_loki",
                input: %{"query" => "{namespace=\"${namespace}\"}", "limit" => 50}
              }
            }
          ]
        )

      timestamp = ~U[2026-09-07 22:00:00Z]
      expect(Client, :connect, fn -> {:ok, :mock_conn} end)

      expect(Stub, :logs, fn :mock_conn, input, opts ->
        assert opts[:timeout] == :timer.minutes(2)
        assert input.query == "{namespace=\"production\"}"
        assert input.limit == 50

        {:ok,
         %LogsQueryOutput{
           logs: [
             %LogEntry{
               timestamp: Google.Protobuf.from_datetime(timestamp),
               message: "request failed",
               labels: %{"namespace" => "production", "pod" => "api-0"}
             }
           ]
         }}
      end)

      {:ok, %{data: %{"workbenchDashboard" => found}}} =
        run_query(
          """
          query Dashboard($id: ID!, $input: Json!, $timeRange: DashboardTimeRangeAttributes!) {
            workbenchDashboard(id: $id) {
              graph(identifier: "errors", input: $input, timeRange: $timeRange) {
                metrics { name value }
                logs { timestamp message labels }
              }
            }
          }
          """,
          %{
            "id" => dashboard.id,
            "input" => Jason.encode!(%{"namespace" => "production"}),
            "timeRange" => %{
              "start" => "2026-09-07T21:00:00Z",
              "end" => "2026-09-07T22:00:00Z"
            }
          },
          %{current_user: admin_user()}
        )

      assert found["graph"]["metrics"] == nil
      assert [log] = found["graph"]["logs"]
      assert log["message"] == "request failed"
      assert log["labels"] == %{"namespace" => "production", "pod" => "api-0"}
    end

    test "rejects dashboard queries denied by a workbench policy" do
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

          deny[{"message": "dashboard query blocked"}] if {
            input.tool_name == "workbench_observability_metrics_prom"
            input.tool.query == "forbidden"
          }
          """
        )

      insert(:workbench_policy,
        workbench: workbench,
        policy: policy,
        matches: %{regexes: ["^workbench_observability_metrics_prom$"]}
      )

      dashboard =
        insert(:dashboard,
          workbench: workbench,
          graphs: [
            %Dashboard.Graph{
              identifier: "requests",
              type: :timeseries,
              layout: %Dashboard.Graph.Layout{x: 0, y: 0, w: 2, h: 2},
              datasource: %Dashboard.Datasource{
                type: :metrics,
                tool: "workbench_observability_metrics_prom",
                input: %{"query" => "${query}"}
              }
            }
          ]
        )

      reject(&Client.connect/0)

      {:ok, %{errors: errors}} =
        run_query(
          """
          query Dashboard($id: ID!, $input: Json!, $timeRange: DashboardTimeRangeAttributes!) {
            workbenchDashboard(id: $id) {
              graph(identifier: "requests", input: $input, timeRange: $timeRange) {
                metrics { name value }
              }
            }
          }
          """,
          %{
            "id" => dashboard.id,
            "input" => Jason.encode!(%{"query" => "forbidden"}),
            "timeRange" => %{
              "start" => "2026-09-07T21:00:00Z",
              "end" => "2026-09-07T22:00:00Z"
            }
          },
          %{current_user: admin_user()}
        )

      assert Enum.any?(errors, &String.contains?(&1.message, "Policy denied"))
    end
  end
end
