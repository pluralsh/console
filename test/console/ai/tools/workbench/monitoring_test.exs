defmodule Console.AI.Tools.Workbench.MonitoringTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.Monitoring
  alias Console.AI.Tools.Workbench.Monitoring.{
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
               ~w(workbench_dashboard_upsert workbench_dashboard_delete workbench_monitor_upsert workbench_monitor_delete)
             )
  end

  test "creates a dashboard in the current workbench and associates it to the job" do
    user = insert(:user, roles: %{admin: true})
    job = insert(:workbench_job, user: user)

    assert {:ok, tool} =
             Tool.validate(
               %DashboardUpsert{job: job, user: user},
               %{
                 "attributes" => %{
                   "name" => "API health",
                   "graphs" => [
                     %{
                       "identifier" => "requests",
                       "type" => "timeseries",
                       "layout" => %{"x" => 0, "y" => 0, "w" => 6, "h" => 4},
                       "datasource" => %{
                         "type" => "metrics",
                         "tool" => "workbench_observability_metrics_prom",
                         "input" => %{"query" => "sum(rate(http_requests_total[5m]))"}
                       }
                     }
                   ]
                 }
               }
             )

    assert %DashboardUpsert.Attributes{} = tool.attributes
    assert {:ok, json} = DashboardUpsert.implement(tool)
    assert %{"name" => "API health", "id" => dashboard_id} = Jason.decode!(json)

    assert Repo.get_by(WorkbenchJobAssociation,
             workbench_job_id: job.id,
             dashboard_id: dashboard_id
           )
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
