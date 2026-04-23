defmodule Console.AI.Workbench.Subagents.ObservabilityTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Workbench.{Subagents, Environment}
  alias Console.AI.{Provider, Tool}
  alias Console.AI.Tools.Workbench.Observability.Metrics
  alias Console.Deployments.Workbenches
  import ElasticsearchUtils

  setup :set_mimic_global

  describe "run/3" do
    test "happy path: metrics tool call then observability_result, output and metrics query set and persisted" do
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: es_settings()},
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{
            enabled: true,
            store: :elastic,
            elastic: es_vector_settings(),
          },
        }
      )

      metrics_tool_name = "workbench_observability_metrics_prom"
      metrics_query = %{"tool_name" => metrics_tool_name, "tool_args" => %{"query" => "up"}}
      sample_logs = [
        %{
          "timestamp" => "2025-02-25T12:00:01Z",
          "message" => "connection reset",
          "labels" => %{"pod" => "api-1"}
        }
      ]
      result_output = "Investigation complete. CPU usage is at 50%."

      expect(Provider, :completion, fn _, _ ->
        {:ok, "querying metrics", [
          %Tool{
            name: metrics_tool_name,
            arguments: %{"query" => "up"},
            id: "1"
          }
        ]}
      end)
      expect(Metrics, :implement, fn _input -> {:ok, "{\"metrics\":[]}"} end)
      expect(Provider, :completion, fn _, _ ->
        {:ok, "summarizing", [
          %Tool{
            name: "observability_result",
            arguments: %{
              "output" => result_output,
              "metrics_query" => metrics_query,
              "logs" => sample_logs
            },
            id: "2"
          }
        ]}
      end)

      workbench =
        insert(:workbench,
          configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}}
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

      insert(:workbench_tool_association, workbench: workbench, tool: tool)
      job = insert(:workbench_job, workbench: workbench)
      activity = insert(:workbench_job_activity, workbench_job: job, type: :observability)

      result = Subagents.Observability.run(activity, job, Environment.new(job, [tool], []))

      assert result[:status] == :successful
      assert result[:result][:output] == result_output
      assert result[:result][:metrics_query].tool_name == metrics_tool_name
      assert result[:result][:metrics_query].tool_args == %{"query" => "up"}
      assert length(result[:result][:logs]) == 1
      [result_log] = result[:result][:logs]
      assert result_log.message == "connection reset"
      assert result_log.labels == %{"pod" => "api-1"}

      {:ok, updated} = Workbenches.update_job_activity(result, activity)
      assert updated.status == :successful
      assert updated.result.output == result_output
      assert updated.result.metrics_query.tool_name == metrics_tool_name
      assert updated.result.metrics_query.tool_args == %{"query" => "up"}
      assert length(updated.result.logs) == 1
      [persisted_log] = updated.result.logs
      assert persisted_log.message == "connection reset"
      assert persisted_log.labels == %{"pod" => "api-1"}
    end
  end
end
