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
    MetricsQueryOutput,
    TraceSpan,
    TracesQueryOutput
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

    test "it can preview live threshold timeseries for a monitor" do
      monitor =
        insert(:monitor,
          threshold: %{aggregate: :max, value: 2.0},
          query: %{log: %{query: "error", bucket_size: "5m", duration: "10m", facets: []}}
        )

      ts = DateTime.utc_now() |> DateTime.truncate(:second)
      expect(Console.Logs.Provider, :aggregate, fn _query ->
        {:ok, [%Console.Logs.AggregationBucket{count: 3.5, timestamp: ts}]}
      end)

      {:ok, %{data: %{"monitor" => found}}} = run_query("""
        query Monitor($id: ID!) {
          monitor(id: $id) {
            id
            preview {
              threshold
              metrics { timestamp value }
            }
          }
        }
      """, %{"id" => monitor.id}, %{current_user: admin_user()})

      assert found["id"] == monitor.id
      assert found["preview"]["threshold"] == 2.0
      assert [point] = found["preview"]["metrics"]
      # :long serializes as a string over the wire
      assert point["timestamp"] == to_string(DateTime.to_unix(ts))
      assert point["value"] == "3.5"
    end

    test "a workbench member can preview a service-less monitor" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      monitor =
        insert(:monitor,
          service: nil,
          workbench: workbench,
          threshold: %{aggregate: :max, value: 2.0},
          query: %{log: %{query: "error", bucket_size: "5m", duration: "10m", facets: []}}
        )

      expect(Console.Logs.Provider, :aggregate, fn _query ->
        {:ok, [%Console.Logs.AggregationBucket{count: 1.0, timestamp: DateTime.utc_now()}]}
      end)

      {:ok, %{data: %{"monitor" => found}}} = run_query("""
        query Monitor($id: ID!) {
          monitor(id: $id) {
            id
            preview { threshold metrics { timestamp value } }
          }
        }
      """, %{"id" => monitor.id}, %{current_user: user})

      assert found["id"] == monitor.id
      assert found["preview"]["threshold"] == 2.0
    end

    test "a user without access cannot fetch or preview a monitor" do
      monitor = insert(:monitor, service: nil, workbench: insert(:workbench))

      {:ok, %{errors: [_ | _], data: %{"monitor" => nil}}} = run_query("""
        query Monitor($id: ID!) {
          monitor(id: $id) {
            id
            preview { threshold metrics { timestamp value } }
          }
        }
      """, %{"id" => monitor.id}, %{current_user: insert(:user)})
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
      tool = insert(:workbench_tool, name: "prometheus", tool: :prometheus)
      dashboard = build(:dashboard)
      graphs = Enum.map(dashboard.graphs, &%{&1 | tool_id: tool.id})
      dashboard = insert(:dashboard, graphs: graphs)

      {:ok, %{data: %{"workbenchDashboard" => found}}} =
        run_query(
          """
          query Dashboard($id: ID!) {
            workbenchDashboard(id: $id) {
              id
              name
              graphs {
                identifier
                toolId
                workbenchTool { id name tool }
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
      assert graph["toolId"] == tool.id
      assert graph["workbenchTool"] == %{
               "id" => tool.id,
               "name" => tool.name,
               "tool" => "PROMETHEUS"
             }
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

  describe "workbench monitoring" do
    @monitoring_query """
    query Monitoring($id: ID!, $q: String, $first: Int!, $after: String) {
      workbench(id: $id) {
        monitors(q: $q, first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges { node { id name } }
        }
        workbenchDashboards(q: $q, first: $first) {
          edges { node { id name } }
        }
      }
    }
    """

    test "searches and paginates monitors within the workbench" do
      workbench = insert(:workbench)
      second = insert(:monitor, name: "cpu-b", service: nil, workbench: workbench)
      first = insert(:monitor, name: "cpu-a", service: nil, workbench: workbench)
      insert(:monitor, name: "memory", service: nil, workbench: workbench)
      insert(:monitor, name: "cpu-other", service: nil, workbench: insert(:workbench))
      dashboard = insert(:dashboard, name: "cpu-dashboard", workbench: workbench)
      insert(:dashboard, name: "memory-dashboard", workbench: workbench)
      insert(:dashboard, name: "cpu-other")

      vars = %{"id" => workbench.id, "q" => "cpu", "first" => 1}
      {:ok, %{data: %{"workbench" => found}}} =
        run_query(@monitoring_query, vars, %{current_user: admin_user()})

      assert ids_equal(from_connection(found["monitors"]), [first])
      assert ids_equal(from_connection(found["workbenchDashboards"]), [dashboard])
      assert found["monitors"]["pageInfo"]["hasNextPage"]

      vars = Map.put(vars, "after", found["monitors"]["pageInfo"]["endCursor"])
      {:ok, %{data: %{"workbench" => next}}} =
        run_query(@monitoring_query, vars, %{current_user: admin_user()})

      assert ids_equal(from_connection(next["monitors"]), [second])
      refute next["monitors"]["pageInfo"]["hasNextPage"]
    end

    test "does not expose monitoring for an inaccessible workbench" do
      workbench = insert(:workbench)
      insert(:monitor, service: nil, workbench: workbench)
      insert(:dashboard, workbench: workbench)

      {:ok, %{errors: [_ | _], data: %{"workbench" => nil}}} =
        run_query(@monitoring_query, %{"id" => workbench.id, "first" => 10}, %{current_user: insert(:user)})
    end

    test "returns empty connections when no names match" do
      workbench = insert(:workbench)
      insert(:monitor, service: nil, workbench: workbench)
      insert(:dashboard, workbench: workbench)

      {:ok, %{data: %{"workbench" => found}}} =
        run_query(@monitoring_query, %{"id" => workbench.id, "q" => "absent", "first" => 10}, %{current_user: admin_user()})

      assert from_connection(found["monitors"]) == []
      assert from_connection(found["workbenchDashboards"]) == []
    end

    test "lists only jobs triggered by the selected monitor in this workbench" do
      workbench = insert(:workbench)
      monitor = insert(:monitor, service: nil, workbench: workbench)
      alert = insert(:alert, monitor: monitor, workbench: workbench)
      job = insert(:workbench_job, workbench: workbench, alert: alert)
      insert(:workbench_job, alert: alert)
      insert(:workbench_job, workbench: workbench)
      insert(:workbench_job, workbench: workbench, alert: insert(:alert))

      {:ok, %{data: %{"workbench" => %{"runs" => found}}}} = run_query("""
        query MonitorJobs($id: ID!, $monitorId: ID!) {
          workbench(id: $id) {
            runs(monitorId: $monitorId, first: 10) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => workbench.id, "monitorId" => monitor.id}, %{current_user: admin_user()})

      assert ids_equal(from_connection(found), [job])
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
        assert input.step == "30s"
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
                traces { traceId spanId name }
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
      assert found["graphData"]["traces"] == nil
      assert found["inputValues"] == ["production", "staging"]
    end

    test "formats computed metric steps per provider and omits them for dynatrace" do
      workbench = insert(:workbench)

      azure =
        insert(:workbench_tool,
          project: workbench.project,
          name: "azuremon",
          tool: :azure,
          categories: [:metrics],
          configuration: %{
            azure: %{
              subscription_id: "sub",
              tenant_id: "tenant",
              client_id: "client",
              client_secret: "secret"
            }
          }
        )

      dynatrace =
        insert(:workbench_tool,
          project: workbench.project,
          name: "dt",
          tool: :dynatrace,
          categories: [:metrics],
          configuration: %{
            dynatrace: %{url: "https://dt.example.com", platform_token: "token"}
          }
        )

      insert(:workbench_tool_association, workbench: workbench, tool: azure)
      insert(:workbench_tool_association, workbench: workbench, tool: dynatrace)

      dashboard =
        insert(:dashboard,
          workbench: workbench,
          graphs: [
            %Dashboard.Graph{
              identifier: "azure_cpu",
              type: :timeseries,
              layout: %Dashboard.Graph.Layout{x: 0, y: 0, w: 2, h: 2},
              datasource: %Dashboard.Datasource{
                type: :metrics,
                tool: "workbench_observability_metrics_azuremon",
                input: %{"query" => "azure_cpu"}
              }
            },
            %Dashboard.Graph{
              identifier: "dt_cpu",
              type: :timeseries,
              layout: %Dashboard.Graph.Layout{x: 0, y: 2, w: 2, h: 2},
              datasource: %Dashboard.Datasource{
                type: :metrics,
                tool: "workbench_observability_metrics_dt",
                input: %{"query" => "dynatrace_cpu"}
              }
            }
          ]
        )

      start_at = ~U[2026-09-07 21:00:00Z]
      end_at = ~U[2026-09-07 22:00:00Z]

      expect(Client, :connect, 2, fn -> {:ok, :mock_conn} end)

      expect(Stub, :metrics, 2, fn :mock_conn, input, _opts ->
        case input.query do
          "azure_cpu" ->
            assert input.step == "PT15S"
            refute is_nil(input.range)
          "dynatrace_cpu" ->
            assert is_nil(input.step)
            assert is_nil(input.range)
        end

        {:ok, %MetricsQueryOutput{metrics: []}}
      end)

      {:ok, %{data: %{"workbenchDashboard" => found}}} =
        run_query(
          """
          query Dashboard($id: ID!, $input: Json!, $timeRange: DashboardTimeRangeAttributes!) {
            workbenchDashboard(id: $id) {
              azure: graph(identifier: "azure_cpu", input: $input, timeRange: $timeRange) {
                metrics { timestamp name value labels }
              }
              dynatrace: graph(identifier: "dt_cpu", input: $input, timeRange: $timeRange) {
                metrics { timestamp name value labels }
              }
            }
          }
          """,
          %{
            "id" => dashboard.id,
            "input" => Jason.encode!(%{}),
            "timeRange" => %{
              "start" => DateTime.to_iso8601(start_at),
              "end" => DateTime.to_iso8601(end_at)
            }
          },
          %{current_user: admin_user()}
        )

      assert found["azure"]["metrics"] == []
      assert found["dynatrace"]["metrics"] == []
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
                traces { traceId }
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
      assert found["graph"]["traces"] == nil
      assert [log] = found["graph"]["logs"]
      assert log["message"] == "request failed"
      assert log["labels"] == %{"namespace" => "production", "pod" => "api-0"}
    end

    test "fetches typed trace results for trace graphs" do
      workbench = insert(:workbench)

      tool =
        insert(:workbench_tool,
          project: workbench.project,
          name: "tempo",
          tool: :tempo,
          categories: [:traces],
          configuration: %{
            tempo: %{url: "https://tempo.example.com", token: "token", tenant_id: nil}
          }
        )

      insert(:workbench_tool_association, workbench: workbench, tool: tool)

      dashboard =
        insert(:dashboard,
          workbench: workbench,
          graphs: [
            %Dashboard.Graph{
              identifier: "checkout",
              type: :traces,
              layout: %Dashboard.Graph.Layout{x: 0, y: 0, w: 3, h: 4},
              datasource: %Dashboard.Datasource{
                type: :traces,
                tool: "workbench_observability_traces_tempo",
                input: %{"query" => "{ service.name = \"${service}\" }", "limit" => 50}
              }
            }
          ]
        )

      start_at = ~U[2026-09-07 21:00:00Z]
      end_at = ~U[2026-09-07 22:00:00Z]
      span_end = DateTime.add(start_at, 10, :second)
      expect(Client, :connect, fn -> {:ok, :mock_conn} end)

      expect(Stub, :traces, fn :mock_conn, input, opts ->
        assert opts[:timeout] == :timer.minutes(5)
        assert input.query == "{ service.name = \"checkout\" }"
        assert input.limit == 50
        assert DateTime.compare(Google.Protobuf.to_datetime(input.range.start), start_at) == :eq
        assert DateTime.compare(Google.Protobuf.to_datetime(input.range.end), end_at) == :eq

        {:ok,
         %TracesQueryOutput{
           spans: [
             %TraceSpan{
               trace_id: "trace-1",
               span_id: "span-1",
               parent_id: "parent-1",
               name: "GET /checkout",
               service: "checkout",
               start: Google.Protobuf.from_datetime(start_at),
               end: Google.Protobuf.from_datetime(span_end),
               tags: %{"http.method" => "GET"}
             }
           ]
         }}
      end)

      {:ok, %{data: %{"workbenchDashboard" => found}}} =
        run_query(
          """
          query Dashboard($id: ID!, $input: Json!, $timeRange: DashboardTimeRangeAttributes!) {
            workbenchDashboard(id: $id) {
              graph(identifier: "checkout", input: $input, timeRange: $timeRange) {
                metrics { name value }
                logs { message }
                traces { traceId spanId parentId name service start end tags }
              }
            }
          }
          """,
          %{
            "id" => dashboard.id,
            "input" => Jason.encode!(%{"service" => "checkout"}),
            "timeRange" => %{
              "start" => DateTime.to_iso8601(start_at),
              "end" => DateTime.to_iso8601(end_at)
            }
          },
          %{current_user: admin_user()}
        )

      assert found["graph"]["metrics"] == nil
      assert found["graph"]["logs"] == nil
      assert [trace] = found["graph"]["traces"]
      assert trace["traceId"] == "trace-1"
      assert trace["spanId"] == "span-1"
      assert trace["parentId"] == "parent-1"
      assert trace["name"] == "GET /checkout"
      assert trace["service"] == "checkout"
      assert trace["start"]
      assert trace["end"]
      assert trace["tags"] == %{"http.method" => "GET"}
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
          package plrl.workbench

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
