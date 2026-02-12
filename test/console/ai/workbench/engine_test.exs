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
            name: "workbench_plan",
            arguments: %{"todos" => [%{title: "todo 1", description: "todo 1", done: false}]}
          }
        ]}
      end)

      expect(Provider, :completion, fn _, _ ->
        {:ok, "try infrastructure", [
          %Tool{
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
            arguments: %{"conclusion" => "complete"}
          }
        ]}
      end)

      workbench = insert(:workbench, configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}})
      job = insert(:workbench_job, workbench: workbench)

      {:ok, engine} = Engine.new(job)
      {:ok, result} = Engine.run(engine)

      result = Console.Repo.preload(result, [:result])
      assert result.status == :successful
      assert result.result.conclusion == "complete"
    end
  end
end
