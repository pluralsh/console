defmodule Console.AI.Workbench.EnvironmentTest do
  use Console.DataCase, async: true

  alias Console.AI.Workbench.Environment
  alias Console.Repo

  describe "subagents/1" do
    test "infers coding, infrastructure, observability, and integration from workbench job and tools" do
      runtime = insert(:agent_runtime)

      workbench =
        insert(:workbench,
          agent_runtime: runtime,
          configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}}
        )

      prom_tool =
        insert(:workbench_tool,
          project: workbench.project,
          tool: :prometheus,
          name: "prom_metrics",
          categories: [:metrics],
          configuration: %{
            prometheus: %{url: "https://prom.example.com", token: "token", tenant_id: nil}
          }
        )

      http_tool =
        insert(:workbench_tool,
          project: workbench.project,
          tool: :http,
          name: "http_integration",
          configuration: %{
            http: %{
              url: "https://example.com",
              method: :get,
              input_schema: %{"type" => "object", "properties" => %{}}
            }
          }
        )

      insert(:workbench_tool_association, workbench: workbench, tool: prom_tool)
      insert(:workbench_tool_association, workbench: workbench, tool: http_tool)

      job =
        insert(:workbench_job, workbench: workbench)
        |> Repo.preload(workbench: :tools)

      assert Environment.subagents(job)
             |> MapSet.new()
             |> MapSet.equal?(MapSet.new([:observability, :integration, :coding, :infrastructure]))
    end
  end
end
