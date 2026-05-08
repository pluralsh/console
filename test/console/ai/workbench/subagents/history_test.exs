defmodule Console.AI.Workbench.Subagents.HistoryTest do
  use Console.DataCase, async: false

  use Mimic

  alias Console.AI.Workbench.{Subagents.History, Environment}
  alias Console.AI.{Provider, Tool}

  import ElasticsearchUtils

  setup :set_mimic_global

  describe "run/3" do
    test "runs against referenced job activities when referenced_job is set" do
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: es_settings()},
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{
            enabled: true,
            store: :elastic,
            elastic: es_vector_settings()
          }
        }
      )

      workbench = insert(:workbench)

      referenced_job = insert(:workbench_job, workbench: workbench)

      insert(:workbench_job_activity,
        workbench_job: referenced_job,
        type: :integration,
        prompt: "Investigated DATABASE_TIMEOUT errors in the Postgres pool",
        result: %{output: "Pooling layer surfaced DATABASE_TIMEOUT from upstream auth DB."}
      )

      skill_job =
        insert(:workbench_job,
          type: :skill,
          workbench: workbench,
          referenced_job: referenced_job
        )

      skill_job =
        Repo.preload(skill_job, [:referenced_job, :result, :workbench, :user])

      activity =
        insert(:workbench_job_activity,
          workbench_job: skill_job,
          type: :history,
          prompt: "What did we conclude about DATABASE_TIMEOUT?"
        )

      expect(Provider, :completion, fn _, _ ->
        {:ok, "Searching prior activities",
         [
           %Tool{
             name: "workbench_activity_search",
             arguments: %{"regex" => "DATABASE_TIMEOUT"},
             id: "history-search-1"
           }
         ]}
      end)

      expect(Provider, :completion, fn _, _ ->
        {:ok, "Summarizing",
         [
           %Tool{
             name: "subagent_result",
             arguments: %{"output" => "The investigation covered DATABASE_TIMEOUT behavior in Postgres."},
             id: "history-result-1"
           }
         ]}
      end)

      env = Environment.new(skill_job, [], [])
      summary = "The investigation covered DATABASE_TIMEOUT behavior in Postgres."

      assert %{
               status: :successful,
               result: %{output: ^summary}
             } = History.run(activity, skill_job, env)
    end
  end
end
