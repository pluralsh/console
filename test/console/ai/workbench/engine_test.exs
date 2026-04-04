defmodule Console.AI.Workbench.EngineTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Workbench.{Engine, Subagents}
  alias Console.AI.{Provider, Tool}
  import ElasticsearchUtils

  setup :set_mimic_global

  describe "new/1" do
    test "returns an error if the job is not valid" do
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

      expect(Provider, :completion, fn _, _ ->
        {:ok, "Plan complete", [
          %Tool{
            id: "1",
            name: "workbench_plan",
            arguments: %{"todos" => [%{name: "todo 1", description: "todo 1", done: false}]}
          }
        ]}
      end)

      expect(Provider, :completion, fn _, _ ->
        {:ok, "make notes", [
          %Tool{
            id: "2",
            name: "workbench_notes",
            arguments: %{"status" => %{working_theory: "working theory"}, "summary" => "make notes"}
          }
        ]}
      end)

      expect(Provider, :completion, fn _, _ ->
        {:ok, "try infrastructure", [
          %Tool{
            id: "3",
            name: "workbench_subagent",
            arguments: %{"prompt" => "try infrastructure", "subagent" => "infrastructure"}
          }
        ]}
      end)

      expect(Provider, :completion, fn _, _ -> {:ok, "need more information"} end)

      expect(Subagents.Infrastructure, :run, fn _, _, _ -> %{status: :successful, result: %{output: "infrastructure result"}} end)

      expect(Provider, :completion, fn _, _ ->
        {:ok, "complete", [
          %Tool{
            name: "workbench_complete",
            arguments: %{
              "conclusion" => "complete",
              "todos" => [%{name: "todo 1", description: "todo 1", done: true}],
              "logs" => [
                %{
                  "timestamp" => "2025-02-25T12:00:00Z",
                  "message" => "shutdown complete",
                  "labels" => %{"service" => "worker"}
                }
              ]
            }
          }
        ]}
      end)

      workbench = insert(:workbench, configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}})
      job = insert(:workbench_job, workbench: workbench)

      {:ok, engine} = Engine.new(job)
      {:ok, result} = Engine.run(engine)

      result = Console.Repo.preload(result, :result)
      assert result.status == :successful
      assert result.result.conclusion == "complete"
      assert result.result.metadata
      assert [log] = result.result.metadata.logs
      assert log.message == "shutdown complete"
      assert log.labels == %{"service" => "worker"}

      activities = Console.Repo.all(Console.Schema.WorkbenchJobActivity)
      memo = Enum.find(activities, & &1.type == :memo)
      assert memo.prompt == "make notes"
      assert memo.tool_call.name == "workbench_notes"

      infra = Enum.find(activities, & &1.type == :infrastructure)
      assert infra.prompt == "try infrastructure"
      assert infra.tool_call.name == "workbench_subagent"
    end
  end
end
