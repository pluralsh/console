defmodule Console.AI.Workbench.Subagents.PlanTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Workbench.{Subagents, Environment}
  alias Console.AI.{Provider, Tool}
  import ElasticsearchUtils

  setup :set_mimic_global

  describe "run/2" do
    @tag :skip
    test "makes one plan tool call and persists the plan todos" do
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

      todos = [
        %{
          "title" => "Inspect the error",
          "description" => "Review the failing workbench state and inputs.",
          "done" => false
        }
      ]

      expect(Provider, :completion, 1, fn _, _ ->
        {:ok, "planning", [
          %Tool{
            name: "workbench_plan",
            arguments: %{"todos" => todos},
            id: "1"
          }
        ]}
      end)

      workbench =
        insert(:workbench,
          configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}}
        )

      job =
        insert(:workbench_job, workbench: workbench)
        |> Repo.preload(workbench: [:tools])

      {:ok, updated_job} = Subagents.Plan.run(job, Environment.new(job, [], []))
      updated_job = Repo.preload(updated_job, [:result])

      assert updated_job.status == :running
      assert Enum.map(updated_job.result.todos, &Map.take(&1, [:title, :description, :done])) == [
               %{
                 title: "Inspect the error",
                 description: "Review the failing workbench state and inputs.",
                 done: false
               }
             ]

    end
  end
end
