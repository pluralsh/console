defmodule Console.AI.Workbench.Subagents.MonitoringTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool
  alias Console.AI.Workbench.{Environment, Subagents}

  test "includes monitoring CRUD, discovery, and observability query tools" do
    user = insert(:user, roles: %{admin: true})
    workbench = insert(:workbench)

    prometheus =
      insert(:workbench_tool,
        project: workbench.project,
        tool: :prometheus,
        name: "prom",
        categories: [:metrics],
        configuration: %{
          prometheus: %{url: "https://prom.example.com", token: "token", tenant_id: nil}
        }
      )

    job = insert(:workbench_job, workbench: workbench, user: user)
    environment = Environment.new(job, [prometheus], [])
    names = Subagents.Monitoring.tools(environment, job) |> Enum.map(&Tool.name/1)

    assert "workbench_observability_metrics_prom" in names
    assert "workbench_dashboards" in names
    assert "workbench_dashboard" in names
    assert "workbench_dashboard_upsert" in names
    assert "workbench_dashboard_graph_delete" in names
    assert "workbench_dashboard_delete" in names
    assert "workbench_monitors" in names
    assert "workbench_monitor" in names
    assert "workbench_monitor_upsert" in names
    assert "workbench_monitor_delete" in names
  end

  test "observability subagent includes dashboard and monitor discovery tools" do
    job = insert(:workbench_job)
    names =
      Environment.new(job, [], [])
      |> Subagents.Observability.tools()
      |> Enum.map(&Tool.name/1)

    assert "workbench_dashboards" in names
    assert "workbench_dashboard" in names
    assert "workbench_monitors" in names
    assert "workbench_monitor" in names
    refute "workbench_dashboard_upsert" in names
    refute "workbench_monitor_upsert" in names
  end
end
