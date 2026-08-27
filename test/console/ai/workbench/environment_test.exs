defmodule Console.AI.Workbench.EnvironmentTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool
  alias Console.AI.Workbench.Environment
  alias Console.Repo
  alias Console.Schema.WorkbenchPolicy

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

  describe "engine_opts/1" do
    test "includes the workbench's cached compiled policies" do
      workbench = insert(:workbench)
      policy = insert(:policy)

      %WorkbenchPolicy{policy_id: policy.id, workbench_id: workbench.id}
      |> WorkbenchPolicy.changeset(%{matches: %{regexes: ["^protected_tool$"]}})
      |> Repo.insert!()

      environment = Environment.new(insert(:workbench_job, workbench: workbench), [], [])

      assert [%Tool.Policy{policy_id: policy_id, regexes: [regex]}] =
               Environment.engine_opts(environment)[:policies]

      assert policy_id == policy.id
      assert Regex.match?(regex, "protected_tool")
    end

    test "uses the workbench tool model, not the agent runtime model" do
      deployment_settings(ai: %{
        enabled: true,
        provider: :openai,
        openai: %{tool_model: "default-tool-model"},
        price_sheets: [
          %{provider: :openai, model: "default-tool-model", input_price: 1.0, output_price: 2.0},
          %{provider: :anthropic, model: "claude-sonnet-4-5", input_price: 3.0, output_price: 15.0}
        ]
      })

      runtime = insert(:agent_runtime, model: %{provider: :anthropic, model: "claude-sonnet-4-5"})
      workbench = insert(:workbench, agent_runtime: runtime)
      job = insert(:workbench_job,
        workbench: workbench,
        modes: %{model: %{provider: :openai, model: "default-tool-model"}}
      ) |> Repo.preload(workbench: :agent_runtime)
      run = insert(:agent_run, runtime: runtime) |> Repo.preload(:runtime)

      engine_opts = Environment.engine_opts(job)
      assert engine_opts[:provider] == :openai
      assert engine_opts[:model] == "default-tool-model"

      assert Console.AI.ModelSelection.runtime_model(run) == %{
        provider: :anthropic,
        model: "claude-sonnet-4-5"
      }
    end
  end
end
