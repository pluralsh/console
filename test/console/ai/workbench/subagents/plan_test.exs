defmodule Console.AI.Workbench.Subagents.PlanTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Workbench.{Subagents, Environment}
  alias Console.AI.{Provider, Tool}
  alias Console.AI.Tool.Policy
  import ElasticsearchUtils

  setup :set_mimic_global

  describe "run/2" do
    test "does not execute a tool call denied by a workbench policy" do
      workbench = insert(:workbench)
      job = insert(:workbench_job, workbench: workbench) |> Repo.preload(workbench: :tools)
      environment = %Environment{job: job, skills: %{}, tools: %{}, policies: [denying_policy()]}

      expect(Provider, :completion, fn _, _ ->
        {:ok, "planning", [%Tool{name: "workbench_plan", arguments: %{"todos" => []}, id: "1"}]}
      end)

      expect(Provider, :completion, fn messages, _ ->
        assert Enum.any?(messages, fn
                 {:tool, content, %{name: "workbench_plan"}} -> content =~ "Policy denied"
                 _ -> false
               end)

        {:ok, "done", []}
      end)

      {:ok, updated_job} = Subagents.Plan.run(job, environment)

      assert updated_job.status == :failed
    end

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

  defp denying_policy do
    %Policy{
      regexes: [~r/^workbench_plan$/],
      name: "deny-plan",
      policy_id: Ecto.UUID.generate(),
      policy: """
      package plrl.wb.admission

      sample := 0

      deny[{"message": "plans are denied"}] if {
        true
      }
      """
    }
  end
end
