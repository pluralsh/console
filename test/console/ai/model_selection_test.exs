defmodule Console.AI.ModelSelectionTest do
  use Console.DataCase, async: true
  alias Console.AI.ModelSelection
  alias Console.Repo

  describe "tool_model/2" do
    test "prefers a job model override over the configured tool model" do
      settings = deployment_settings(ai: %{
        enabled: true,
        provider: :openai,
        tool_provider: :anthropic,
        openai: %{tool_model: "openai-tool-model"},
        anthropic: %{tool_model: "anthropic-tool-model"}
      })

      job = insert(:workbench_job, modes: %{model: %{provider: :openai, model: "job-tool-model"}})

      assert ModelSelection.tool_model(job, settings) == %{
        provider: :openai,
        model: "job-tool-model"
      }
    end

    test "falls back to the configured tool model" do
      settings = deployment_settings(ai: %{
        enabled: true,
        provider: :openai,
        tool_provider: :anthropic,
        openai: %{tool_model: "openai-tool-model"},
        anthropic: %{tool_model: "anthropic-tool-model"}
      })

      job = insert(:workbench_job)

      assert ModelSelection.tool_model(job, settings) == %{
        provider: :anthropic,
        model: "anthropic-tool-model"
      }
    end
  end

  describe "runtime_model/1" do
    test "reads the model from an agent runtime" do
      runtime = insert(:agent_runtime, model: %{provider: :anthropic, model: "claude-sonnet-4-5"})

      assert ModelSelection.runtime_model(runtime) == %{
        provider: :anthropic,
        model: "claude-sonnet-4-5"
      }
    end

    test "reads the model from an agent run's runtime" do
      runtime = insert(:agent_runtime, model: %{provider: :openai, model: "gpt-5.4"})
      run = insert(:agent_run, runtime: runtime) |> Repo.preload(:runtime)

      assert ModelSelection.runtime_model(run) == %{provider: :openai, model: "gpt-5.4"}
    end

    test "reads the model from a workbench job's agent runtime" do
      runtime = insert(:agent_runtime, model: %{provider: :vertex, model: "gemini-2.5-pro"})
      workbench = insert(:workbench, agent_runtime: runtime)
      job = insert(:workbench_job, workbench: workbench) |> Repo.preload(workbench: :agent_runtime)

      assert ModelSelection.runtime_model(job) == %{provider: :vertex, model: "gemini-2.5-pro"}
    end

    test "is independent of the workbench tool model override" do
      runtime = insert(:agent_runtime, model: %{provider: :anthropic, model: "claude-sonnet-4-5"})
      workbench = insert(:workbench, agent_runtime: runtime)
      job = insert(:workbench_job,
        workbench: workbench,
        modes: %{model: %{provider: :openai, model: "job-tool-model"}}
      ) |> Repo.preload(workbench: :agent_runtime)

      assert ModelSelection.runtime_model(job) == %{
        provider: :anthropic,
        model: "claude-sonnet-4-5"
      }
    end

    test "returns nil when the runtime has no model" do
      runtime = insert(:agent_runtime)
      refute ModelSelection.runtime_model(runtime)
    end
  end

  describe "backfill_usage/2" do
    test "computes missing costs from a price sheet" do
      usage = ModelSelection.backfill_usage(
        %{input_tokens: 1_000_000, output_tokens: 250_000},
        %{input_price: 3.0, output_price: 15.0}
      )

      assert usage.input_cost == 3.0
      assert usage.output_cost == 3.75
      assert usage.total_cost == 6.75
    end

    test "preserves costs already reported by the agent" do
      usage = ModelSelection.backfill_usage(
        %{input_tokens: 1_000_000, output_tokens: 250_000, input_cost: 1.0, output_cost: 2.0, total_cost: 3.0},
        %{input_price: 3.0, output_price: 15.0}
      )

      assert usage.input_cost == 1.0
      assert usage.output_cost == 2.0
      assert usage.total_cost == 3.0
    end
  end
end
