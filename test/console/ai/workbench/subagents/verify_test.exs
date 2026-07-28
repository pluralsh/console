defmodule Console.AI.Workbench.Subagents.VerifyTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Workbench.{Environment, Subagents}
  alias Console.AI.{Provider, Tool}

  setup :set_mimic_global

  describe "run/3" do
    test "returns subagent_result with infrastructure and observability tools available" do
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: es_settings()},
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{enabled: false}
        }
      )

      expect(Provider, :completion, fn _, opts ->
        preface = Keyword.fetch!(opts, :preface)
        assert preface =~ "verifying whether the requested work has actually been completed"
        assert preface =~ "Infrastructure tools can inspect Plural Services and Stacks"
        assert preface =~ "Observability tools can inspect metrics, logs, traces, error tracking"

        tool_names =
          Keyword.fetch!(opts, :plural)
          |> Enum.map(&Tool.name/1)

        assert "subagent_result" in tool_names
        assert "plrl_cluster_services" in tool_names
        assert "workbench_observability_metrics_prom" in tool_names

        {:ok, "verified", [
          %Tool{name: "subagent_result", arguments: %{"output" => "verification complete"}, id: "1"}
        ]}
      end)

      workbench =
        insert(:workbench,
          configuration: %{
            infrastructure: %{services: true, stacks: true, kubernetes: true},
            observability: %{metrics: true}
          }
        )

      tool =
        insert(:workbench_tool,
          tool: :prometheus,
          name: "prom",
          categories: [:metrics],
          configuration: %{
            prometheus: %{url: "https://prom.example.com", token: "token", tenant_id: nil}
          }
        )

      job = insert(:workbench_job, workbench: workbench, prompt: "Verify the rollout completed")
      activity = insert(:workbench_job_activity, workbench_job: job, type: :verify, prompt: "Check completion")

      result = Subagents.Verify.run(activity, job, Environment.new(job, [tool], []))

      assert result[:status] == :successful
      assert result[:result][:output] == "verification complete"
    end
  end
end
