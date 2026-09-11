defmodule Console.AI.Tools.Workbench.MonitoringTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.Monitoring
  alias Console.AI.Tools.Workbench.Monitoring.{
    DashboardDelete,
    DashboardGraphDelete,
    DashboardList,
    DashboardUpsert,
    MonitorList,
    MonitorUpsert
  }
  alias Console.Repo
  alias Console.Schema.WorkbenchJobAssociation

  test "upsert JSON schemas fully describe typed attributes" do
    dashboard = DashboardUpsert.json_schema(%DashboardUpsert{})
    monitor = MonitorUpsert.json_schema(%MonitorUpsert{})

    refute schema_key?(dashboard, "additionalProperties")

    assert get_in(monitor, [
             "properties",
             "attributes",
             "properties",
             "modes",
             "properties",
             "model",
             "properties",
             "provider",
             "enum"
           ]) == [
             "openai",
             "anthropic",
             "ollama",
             "azure",
             "bedrock",
             "vertex",
             "openai_compatible",
             "xai"
           ]

    query = get_in(monitor, ["properties", "attributes", "properties", "query"])

    refute Map.has_key?(query, "oneOf")
    refute schema_key?(monitor, "additionalProperties")
    assert get_in(query, ["properties", "log", "required"]) == ["tool", "query", "bucket_size"]
    assert get_in(query, ["properties", "metrics", "required"]) == ["tool", "query"]
  end

  defp schema_key?(%{} = schema, key),
    do: Map.has_key?(schema, key) or Enum.any?(Map.values(schema), &schema_key?(&1, key))

  defp schema_key?(values, key) when is_list(values),
    do: Enum.any?(values, &schema_key?(&1, key))

  defp schema_key?(_, _), do: false

  test "exposes read and write tools with explicit workbench context" do
    user = insert(:user, roles: %{admin: true})
    job = insert(:workbench_job, user: user)

    assert Monitoring.read_tools(job)
           |> Enum.map(&Tool.name/1)
           |> MapSet.new() ==
             MapSet.new(~w(workbench_dashboards workbench_dashboard workbench_monitors workbench_monitor))

    assert Monitoring.write_tools(job, user)
           |> Enum.map(&Tool.name/1)
           |> MapSet.new() ==
             MapSet.new(
               ~w(workbench_dashboard_upsert workbench_dashboard_graph_delete workbench_dashboard_delete workbench_monitor_upsert workbench_monitor_delete)
             )
  end

  test "creates a dashboard in the current workbench and associates it to the job" do
    user = insert(:user, roles: %{admin: true})
    workbench = insert(:workbench)
    job = insert(:workbench_job, workbench: workbench, user: user)

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

    assert {:ok, tool} =
             Tool.validate(
               %DashboardUpsert{job: job, user: user},
               %{
                 "dashboard_name" => "API health",
                 "graph" => %{
                   "identifier" => "requests",
                   "type" => "timeseries",
                   "layout" => %{"x" => 0, "y" => 0, "w" => 6, "h" => 4},
                   "datasource" => %{
                     "type" => "metrics",
                     "tool" => "workbench_observability_metrics_prom",
                     "input" => %{"query" => "sum(rate(http_requests_total[5m]))"}
                   }
                 }
               }
             )

    assert %Console.Schema.Dashboard.Graph{} = tool.graph
    assert {:ok, json} = DashboardUpsert.implement(tool)

    assert %{
             "name" => "API health",
             "id" => dashboard_id,
             "graphs" => [%{"identifier" => "requests"}]
           } = Jason.decode!(json)

    assert Repo.get_by(WorkbenchJobAssociation,
             workbench_job_id: job.id,
             dashboard_id: dashboard_id
           )
  end

  test "rejects dashboard graphs whose tool call is invalid" do
    user = insert(:user, roles: %{admin: true})
    workbench = insert(:workbench)
    job = insert(:workbench_job, workbench: workbench, user: user)

    assert {:ok, upsert} =
             Tool.validate(
               %DashboardUpsert{job: job, user: user},
               %{
                 "dashboard_name" => "API health",
                 "graph" => %{
                   "identifier" => "requests",
                   "type" => "timeseries",
                   "layout" => %{"x" => 0, "y" => 0, "w" => 6, "h" => 4},
                   "datasource" => %{
                     "type" => "metrics",
                     "tool" => "not_a_real_tool",
                     "input" => %{"query" => "up"}
                   }
                 }
               }
             )

    assert {:error, "tool not found"} = DashboardUpsert.implement(upsert)
    refute Repo.get_by(Console.Schema.Dashboard, workbench_id: workbench.id, name: "API health")
  end

  test "upserts dashboard graphs and deletes them by dashboard name" do
    user = insert(:user, roles: %{admin: true})
    workbench = insert(:workbench)
    job = insert(:workbench_job, workbench: workbench, user: user)

    dashboard =
      insert(:dashboard,
        workbench: workbench,
        name: "API health",
        description: "Existing description",
        graphs: [
          %{
            identifier: "requests",
            type: :timeseries,
            layout: %{x: 0, y: 0, w: 6, h: 4}
          }
        ]
      )

    assert {:ok, upsert} =
             Tool.validate(
               %DashboardUpsert{job: job, user: user},
               %{
                 "dashboard_name" => dashboard.name,
                 "graph" => %{
                   "identifier" => "errors",
                   "type" => "stat",
                   "layout" => %{"x" => 6, "y" => 0, "w" => 6, "h" => 4}
                 }
               }
             )

    assert {:ok, json} = DashboardUpsert.implement(upsert)

    assert %{
             "description" => "Existing description",
             "graphs" => [%{"identifier" => "requests"}, %{"identifier" => "errors"}]
           } = Jason.decode!(json)

    assert {:ok, delete} =
             Tool.validate(
               %DashboardGraphDelete{job: job, user: user},
               %{
                 "dashboard_name" => dashboard.name,
                 "graph_identifier" => "requests"
               }
             )

    assert {:ok, json} = DashboardGraphDelete.implement(delete)
    assert %{"graphs" => [%{"identifier" => "errors"}]} = Jason.decode!(json)
  end

  test "deletes an entire dashboard by name" do
    user = insert(:user, roles: %{admin: true})
    workbench = insert(:workbench)
    job = insert(:workbench_job, workbench: workbench, user: user)
    dashboard = insert(:dashboard, workbench: workbench, name: "API health")

    assert {:ok, delete} =
             Tool.validate(
               %DashboardDelete{job: job, user: user},
               %{"dashboard_name" => dashboard.name}
             )

    assert {:ok, "Deleted dashboard API health"} = DashboardDelete.implement(delete)
    refute Repo.get(Console.Schema.Dashboard, dashboard.id)
  end

  test "dashboard and monitor lists support search and offset pagination" do
    workbench = insert(:workbench)
    job = insert(:workbench_job, workbench: workbench)
    insert(:dashboard, workbench: workbench, name: "API availability")
    insert(:dashboard, workbench: workbench, name: "API latency")
    insert(:dashboard, workbench: workbench, name: "Database")
    insert(:monitor, workbench: workbench, name: "API errors")
    insert(:monitor, workbench: workbench, name: "Database saturation")

    assert {:ok, dashboards_json} =
             DashboardList.implement(%DashboardList{
               job: job,
               q: "api",
               limit: 1,
               offset: 1
             })

    assert [%{"name" => "API latency"}] = Jason.decode!(dashboards_json)

    assert {:ok, monitors_json} =
             MonitorList.implement(%MonitorList{
               job: job,
               q: "database",
               limit: 10,
               offset: 0
             })

    assert [%{"name" => "Database saturation"}] = Jason.decode!(monitors_json)
  end

  test "creates a monitor in the current workbench and associates it to the job" do
    user = insert(:user, roles: %{admin: true})
    workbench = insert(:workbench)
    job = insert(:workbench_job, workbench: workbench, user: user)
    service = insert(:service)

    assert {:ok, tool} =
             Tool.validate(
               %MonitorUpsert{job: job, user: user},
               %{
                 "attributes" => %{
                   "name" => "API errors",
                   "severity" => "high",
                   "type" => "log",
                   "evaluation_cron" => "*/5 * * * *",
                   "service_id" => service.id,
                   "query" => %{
                     "log" => %{
                       "query" => "error",
                       "bucket_size" => "5m",
                       "duration" => "30m"
                     }
                   },
                   "threshold" => %{"aggregate" => "max", "value" => 10}
                 }
               }
             )

    assert %MonitorUpsert.Attributes{} = tool.attributes
    assert {:ok, json} = MonitorUpsert.implement(tool)
    assert %{"name" => "API errors", "id" => monitor_id} = Jason.decode!(json)

    assert Repo.get_by(WorkbenchJobAssociation,
             workbench_job_id: job.id,
             monitor_id: monitor_id
           )
  end
end
