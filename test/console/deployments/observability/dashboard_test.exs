defmodule Console.Deployments.Observability.DashboardTest do
  use Console.DataCase, async: true
  use Mimic

  alias CloudQuery.Client
  alias Toolquery.ToolQuery.Stub
  alias Toolquery.{LogEntry, LogsQueryOutput}

  alias Console.Deployments.Observability.Dashboard
  alias Console.Schema.Dashboard.{Input, Graph, Datasource}

  describe "substitute/2" do
    test "recursively substitutes Grafana-style dashboard variables" do
      value = %{
        "query" => "sum(rate(requests{namespace=\"${namespace}\",pod=~\"${pods}\"}[5m]))",
        "facets" => ["${namespace}", %{"values" => "${pods}"}],
        "unresolved" => "${missing}"
      }

      assert Dashboard.substitute(value, %{
               namespace: "production",
               pods: ["api-0", "api-1"]
             }) == %{
               "query" =>
                 "sum(rate(requests{namespace=\"production\",pod=~\"api-0,api-1\"}[5m]))",
               "facets" => ["production", %{"values" => "api-0,api-1"}],
               "unresolved" => "${missing}"
             }
    end
  end

  describe "metric_query_step/2" do
    test "picks a fine step for short ranges" do
      start_at = ~U[2026-09-07 21:00:00Z]
      end_at = ~U[2026-09-07 22:00:00Z]

      assert Dashboard.metric_query_step(%{start: start_at, end: end_at}) == "15s"
    end

    test "coarsens step for year-long ranges so queries stay under max points" do
      end_at = ~U[2026-09-18 12:00:00Z]
      start_at = DateTime.add(end_at, -365, :day)

      assert Dashboard.metric_query_step(%{"start" => start_at, "end" => end_at}) == "2d"
    end

    test "falls back to whole days past the static candidates" do
      end_at = ~U[2026-09-18 12:00:00Z]
      start_at = DateTime.add(end_at, -730, :day)

      assert Dashboard.metric_query_step(%{start: start_at, end: end_at}) == "4d"
    end

    test "formats ISO-8601 intervals for azure" do
      start_at = ~U[2026-09-07 21:00:00Z]
      end_at = ~U[2026-09-07 22:00:00Z]

      assert Dashboard.metric_query_step(%{start: start_at, end: end_at}, :iso8601) == "PT15S"
    end

    test "returns nil when the provider takes no step" do
      start_at = ~U[2026-09-07 21:00:00Z]
      end_at = ~U[2026-09-07 22:00:00Z]

      assert Dashboard.metric_query_step(%{start: start_at, end: end_at}, :none) == nil
    end
  end

  describe "public_variables/2" do
    test "uses defaults only and derives time_range inputs from the window" do
      dashboard = build(:dashboard, inputs: [
        %Input{name: "ns", type: :text, default: "prod"},
        %Input{name: "pod", type: :text, default: nil},
        %Input{name: "range", type: :time_range, default: "5m"}
      ])
      range = %{start: ~U[2026-10-09 10:00:00Z], end: ~U[2026-10-09 12:00:00Z]}

      assert Dashboard.public_variables(dashboard, range) == %{"ns" => "prod", "range" => "120m"}
    end
  end

  describe "validate_public_range/1" do
    test "accepts a 30 day window" do
      start_at = ~U[2026-09-09 12:00:00Z]
      range = %{start: start_at, end: DateTime.add(start_at, 30, :day)}
      assert {:ok, %{start: ^start_at}} = Dashboard.validate_public_range(range)
    end

    test "accepts iso8601 strings with string keys" do
      assert {:ok, %{start: ~U[2026-10-09 10:00:00Z], end: ~U[2026-10-09 12:00:00Z]}} =
               Dashboard.validate_public_range(%{"start" => "2026-10-09T10:00:00Z", "end" => "2026-10-09T12:00:00Z"})
    end

    test "rejects windows over 30 days" do
      start_at = ~U[2026-09-09 12:00:00Z]
      range = %{start: start_at, end: DateTime.add(start_at, 30 * 86_400 + 1, :second)}
      assert {:error, _} = Dashboard.validate_public_range(range)
    end

    test "rejects end before or equal start" do
      at = ~U[2026-10-09 12:00:00Z]
      assert {:error, _} = Dashboard.validate_public_range(%{start: at, end: at})
      assert {:error, _} = Dashboard.validate_public_range(%{start: at, end: DateTime.add(at, -1, :second)})
    end

    test "rejects malformed input" do
      assert {:error, _} = Dashboard.validate_public_range(%{})
      assert {:error, _} = Dashboard.validate_public_range(%{"start" => "nope", "end" => "nope"})
    end
  end

  describe "public_graph/3" do
    test "rejects an invalid range before touching any tool" do
      dashboard = build(:dashboard)
      assert {:error, _} = Dashboard.public_graph(dashboard, "requests", %{})
    end
  end

  describe "graph/5" do
    test "without a user drops plural log tools" do
      workbench = insert(:workbench, configuration: %{observability: %{logs: true}})
      dashboard = insert(:dashboard,
        workbench: workbench,
        graphs: [
          %Graph{
            identifier: "logs",
            title: "Logs",
            type: :logs,
            layout: %Graph.Layout{x: 0, y: 0, w: 2, h: 2},
            datasource: %Datasource{type: :logs, tool: "plrl_logs", input: %{}}
          }
        ]
      )
      range = %{start: ~U[2026-10-09 10:00:00Z], end: ~U[2026-10-09 12:00:00Z]}

      assert {:error, msg} = Dashboard.graph(dashboard, "logs", %{}, range, nil)
      assert msg =~ "not found"
    end
  end

  describe "graph/5 anonymous policy handling" do
    setup do
      workbench = insert(:workbench)
      tool = insert(:workbench_tool,
        project: workbench.project,
        name: "loki",
        tool: :loki,
        categories: [:logs],
        configuration: %{loki: %{url: "https://loki.example.com"}}
      )
      insert(:workbench_tool_association, workbench: workbench, tool: tool)

      dashboard = insert(:dashboard,
        workbench: workbench,
        graphs: [
          %Graph{
            identifier: "errors",
            title: "Errors",
            type: :logs,
            layout: %Graph.Layout{x: 0, y: 0, w: 2, h: 2},
            datasource: %Datasource{type: :logs, tool: "workbench_observability_logs_loki", input: %{"query" => "{app=\"x\"}"}}
          }
        ]
      )
      {:ok, workbench: workbench, dashboard: dashboard}
    end

    test "skips workbench policies that match the tool", %{workbench: workbench, dashboard: dashboard} do
      policy = insert(:policy, project: workbench.project, policy: "package plrl.workbench\n\nsample := 0\n")
      insert(:workbench_policy,
        workbench: workbench,
        policy: policy,
        matches: %{regexes: ["^workbench_observability_logs_loki$"]}
      )
      range = %{start: ~U[2026-10-09 10:00:00Z], end: ~U[2026-10-09 12:00:00Z]}

      expect(Client, :connect, 2, fn -> {:ok, :mock_conn} end)
      expect(Stub, :logs, 2, fn :mock_conn, _input, _opts ->
        {:ok, %LogsQueryOutput{logs: [%LogEntry{message: "hi", labels: %{}}]}}
      end)

      assert {:ok, %{logs: [_ | _]}} = Dashboard.public_graph(dashboard, "errors", range)
      assert {:ok, %{logs: [_ | _]}} = Dashboard.graph(dashboard, "errors", %{}, range, nil)
    end

    test "still executes when no policy matches the tool", %{workbench: workbench, dashboard: dashboard} do
      policy = insert(:policy, project: workbench.project, policy: "package plrl.workbench\n\nsample := 0\n")
      insert(:workbench_policy,
        workbench: workbench,
        policy: policy,
        matches: %{regexes: ["^something_else$"]}
      )
      range = %{start: ~U[2026-10-09 10:00:00Z], end: ~U[2026-10-09 12:00:00Z]}

      expect(Client, :connect, fn -> {:ok, :mock_conn} end)
      expect(Stub, :logs, fn :mock_conn, _input, _opts ->
        {:ok, %LogsQueryOutput{logs: [%LogEntry{message: "hi", labels: %{}}]}}
      end)

      assert {:ok, %{logs: [_ | _]}} = Dashboard.public_graph(dashboard, "errors", range)
    end
  end
end
