defmodule Console.AI.Workbench.ToolsTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Workbench.{Tools, Environment, MCP}
  alias Console.AI.MCP.Tool, as: MCPToolSpec
  alias Console.AI.Tools.Workbench.{Http, FunctionCall}
  alias Console.AI.Tools.Workbench.MCP, as: MCPTool
  alias Console.AI.Tools.Workbench.Observability.{Metrics, MetricsSearch, MetricsLabelSearch, Logs, Traces}
  alias Console.AI.Tools.Workbench.Infrastructure.{CloudSchemas, RawCloudQuery, CloudTables}
  alias Console.AI.Tools.Workbench.Integration.Github.ListIssues
  alias Console.AI.Tools.Workbench.Integration.Sentry.ListIssues, as: SentryListIssues
  alias Console.AI.Tools.Workbench.Integration.Slack.ListChannels

  describe "index/1" do
    test "maps workbench tool names to {module, workbench_tool}" do
      workbench = insert(:workbench)
      prom = insert_associated_tool(workbench, :prometheus, "prom", [:metrics], %{
        prometheus: %{url: "https://prom.example.com", token: "token", tenant_id: nil}
      })
      http = insert_associated_tool(workbench, :http, "example", [:integration], %{
        http: %{
          url: "https://example.com",
          method: :get,
          input_schema: %{"type" => "object", "properties" => %{}}
        }
      })
      cloud = insert_associated_tool(workbench, :cloud, "aws", [:infrastructure], %{},
        cloud_connection: insert(:cloud_connection)
      )

      workbench = Repo.preload(workbench, :tools)
      index = Tools.index(workbench)

      assert_indexed(index, "workbench_observability_metrics_prom", Metrics, prom)
      assert_indexed(index, "workbench_observability_metric_search_prom", MetricsSearch, prom)
      assert_indexed(index, "workbench_observability_metric_label_search_prom", MetricsLabelSearch, prom)
      assert_indexed(index, "http_integration_example", Http, http)
      assert_indexed(index, "cloud_schemas_aws", CloudSchemas, cloud)
      assert_indexed(index, "cloud_query_aws", RawCloudQuery, cloud)
      assert_indexed(index, "cloud_tables_aws", CloudTables, cloud)

      {Http, found} = Tools.get(workbench, "http_integration_example")
      assert found.id == http.id
      refute Tools.get(workbench, "missing")
    end

    test "indexes function, slack, sentry, and scm tools" do
      workbench = insert(:workbench)
      lambda = insert(:workbench_function_tool)
      insert(:workbench_tool_association, workbench: workbench, tool: lambda)

      slack = insert_associated_tool(workbench, :slack, "slack", [:chat], %{
        slack: %{bot_token: "xoxb-test"}
      })
      sentry = insert_associated_tool(workbench, :sentry, "sentry", [:error_tracking], %{
        sentry: %{access_token: "token"}
      })
      github = insert_associated_tool(workbench, :github, "gh", [:scm], %{
        github: %{access_token: "token"}
      })
      loki = insert_associated_tool(workbench, :loki, "loki", [:logs], %{
        loki: %{url: "https://loki.example.com"}
      })
      tempo = insert_associated_tool(workbench, :tempo, "tempo", [:traces], %{
        tempo: %{url: "https://tempo.example.com"}
      })

      workbench = Repo.preload(workbench, :tools)
      index = Tools.index(workbench)

      assert_indexed(index, "lambda_function_call_#{lambda.name}", FunctionCall, lambda)
      assert_indexed(index, "slack_list_channels_slack", ListChannels, slack)
      assert_indexed(index, "sentry_list_issues_sentry", SentryListIssues, sentry)
      assert_indexed(index, "github_gh_list_issues", ListIssues, github)
      assert_indexed(index, "workbench_observability_logs_loki", Logs, loki)
      assert_indexed(index, "workbench_observability_traces_tempo", Traces, tempo)
    end

    test "does not treat http function tools as integrations" do
      workbench = insert(:workbench)
      tool = insert_associated_tool(workbench, :http, "fn", [:function], %{
        http: %{
          url: "https://example.com",
          method: :get,
          function: true,
          input_schema: %{"type" => "object", "properties" => %{}}
        }
      })

      workbench = Repo.preload(workbench, :tools)
      index = Tools.index(workbench)

      assert_indexed(index, "http_function_call_fn", FunctionCall, tool)
      refute Map.has_key?(index, "http_integration_fn")
    end
  end

  describe "index/2" do
    test "includes MCP expansions when a job is provided" do
      server = insert(:mcp_server, name: "example", url: "http://localhost:3001/mcp")
      workbench = insert(:workbench)
      tool = insert_associated_tool(workbench, :mcp, "example", [:integration], %{}, mcp_server: server)
      job = insert(:workbench_job, workbench: workbench)
      workbench = Repo.preload(workbench, :tools)

      expect(MCP, :expand_tools, fn tools, found_job ->
        assert Enum.any?(tools, & &1.id == tool.id)
        assert found_job.id == job.id
        [%MCPTool{
          tool: tool,
          job: job,
          mcp_tool: %MCPToolSpec{
            name: "echo",
            description: "echo a message",
            input_schema: %{"type" => "object", "properties" => %{"message" => %{"type" => "string"}}}
          }
        }]
      end)

      index = Tools.index(workbench, job)

      assert_indexed(index, "mcp_example_echo", MCPTool, tool)
      {MCPTool, found} = Tools.get(index, "mcp_example_echo")
      assert found.id == tool.id
    end

    test "indexes environment tools including functions" do
      workbench = insert(:workbench)
      http = insert_associated_tool(workbench, :http, "example", [:integration], %{
        http: %{
          url: "https://example.com",
          method: :get,
          input_schema: %{"type" => "object", "properties" => %{}}
        }
      })
      lambda = insert(:workbench_function_tool)
      insert(:workbench_tool_association, workbench: workbench, tool: lambda)
      job = insert(:workbench_job, workbench: workbench)
      env = Environment.new(job, [http, lambda], [])

      index = Tools.index(env)

      assert_indexed(index, "http_integration_example", Http, http)
      assert_indexed(index, "lambda_function_call_#{lambda.name}", FunctionCall, lambda)
    end
  end

  describe "cloud_tools/1" do
    test "expands cloud workbench tools" do
      tool = insert(:workbench_tool,
        tool: :cloud,
        name: "aws",
        categories: [:infrastructure],
        cloud_connection: insert(:cloud_connection)
      )

      assert [
               %CloudSchemas{tool: ^tool},
               %RawCloudQuery{tool: ^tool},
               %CloudTables{tool: ^tool}
             ] = Tools.cloud_tools([tool])
    end
  end

  describe "obs_tools/1" do
    test "expands metrics categories and ignores unrelated tools" do
      prom = insert(:workbench_tool,
        tool: :prometheus,
        name: "prom",
        categories: [:metrics],
        configuration: %{prometheus: %{url: "https://prom.example.com"}}
      )
      http = insert(:workbench_tool, tool: :http, name: "http")

      names = Tools.obs_tools([prom, http]) |> Enum.map(&Console.AI.Tool.name/1)

      assert "workbench_observability_metrics_prom" in names
      refute Enum.any?(names, &String.contains?(&1, "http"))
    end
  end

  describe "scm_tools/1" do
    test "only expands scm-category tools" do
      github = insert(:workbench_tool,
        tool: :github,
        name: "gh",
        categories: [:scm],
        configuration: %{github: %{access_token: "token"}}
      )
      slack = insert(:workbench_tool,
        tool: :slack,
        name: "slack",
        categories: [:chat],
        configuration: %{slack: %{bot_token: "xoxb-test"}}
      )

      names = Tools.scm_tools([github, slack]) |> Enum.map(&Console.AI.Tool.name/1)

      assert "github_gh_list_issues" in names
      refute Enum.any?(names, &String.starts_with?(&1, "slack_"))
    end
  end

  defp assert_indexed(index, name, mod, tool) do
    assert {^mod, found} = Map.fetch!(index, name)
    assert found.id == tool.id
  end

  defp insert_associated_tool(workbench, type, name, categories, configuration, opts \\ []) do
    tool =
      insert(:workbench_tool, Keyword.merge([
        tool: type,
        name: name,
        categories: categories,
        configuration: configuration,
        project: workbench.project
      ], opts))

    insert(:workbench_tool_association, workbench: workbench, tool: tool)
    tool
  end
end
