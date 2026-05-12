defmodule Console.AI.Workbench.Subagents.SkillTest do
  use Console.DataCase, async: false

  use Mimic

  alias Console.AI.Workbench.{Subagents.Skill, Environment}
  alias Console.AI.{Provider, Tool}

  import ElasticsearchUtils

  setup :set_mimic_global

  describe "run/3" do
    test "without referenced_job, creates a new WorkbenchSkill when the model calls workbench_skill_create" do
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

      job =
        insert(:workbench_job,
          workbench: workbench,
          referenced_job_id: nil,
          result:
            build(:workbench_job_result,
              conclusion: "The auth middleware retries on 503 in a surprising way not documented elsewhere."
            )
        )

      job =
        Repo.preload(job, [:referenced_job, :result, :workbench])

      activity = insert(:workbench_job_activity, workbench_job: job, type: :skill, prompt: "backfill skill from eval")

      skill_name = "auth-middleware-503-pattern"

      expect(Provider, :completion, fn _, _ ->
        {:ok, "creating a new skill to capture this",
         [
           %Tool{
             name: "workbench_skill_create",
             arguments: %{
               "name" => skill_name,
               "description" =>
                 "When Plural retries auth middleware on upstream 503, expect these semantics.",
               "contents" =>
                 "If you see flaky auth during deploys, check middleware retry backoff against the auth service readiness window."
             },
             id: "skill-create-1"
           }
         ]}
      end)

      refute Repo.get_by(Console.Schema.WorkbenchSkill, %{name: skill_name})

      assert %{
               status: :successful,
               result: %{output: "Created new workbench skill" <> _}
             } = Skill.run(activity, job, Environment.new(job, [], []))

      assert %Console.Schema.WorkbenchSkill{
               name: ^skill_name,
               workbench_id: wid
             } = Repo.get_by!(Console.Schema.WorkbenchSkill, name: skill_name)

      assert wid == job.workbench_id
    end

    test "with referenced_job, targets the referenced investigation when creating workbench_skill" do
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

      referenced_job =
        insert(:workbench_job,
          workbench: workbench,
          prompt: "investigate flaky payments after deploy",
          result:
            build(:workbench_job_result,
              conclusion:
                "The payments worker hit Redis connection pooling limits during rollout; backoff settings need tuning."
            )
        )

      insert(:workbench_job_activity,
        workbench_job: referenced_job,
        type: :integration,
        prompt: "Compared Redis metrics before and during the incident window",
        result: %{output: "Pool saturation correlated with reconnect storms."}
      )

      skill_job =
        insert(:workbench_job,
          type: :skill,
          workbench: workbench,
          referenced_job: referenced_job,
          result:
            build(:workbench_job_result,
              conclusion: "this conclusion belongs to the skill job, not the eval target"
            )
        )

      skill_job =
        Repo.preload(skill_job, [
          :result,
          :workbench,
          :user,
          referenced_job: [:activities, :result, :workbench]
        ])

      activity = insert(:workbench_job_activity, workbench_job: skill_job, type: :skill, prompt: "backfill skill from eval")

      skill_name = "redis-pool-rollout-throttling"

      expect(Provider, :completion, fn _, _ ->
        {:ok, "creating a skill from the evaluated investigation",
         [
           %Tool{
             name: "workbench_skill_create",
             arguments: %{
               "name" => skill_name,
               "description" =>
                 "When Redis pool limits thrash during deploys, correlate reconnect storms against pool saturation.",
               "contents" =>
                 "If payments flake only on rollout windows, widen pool limits or stagger worker restarts before touching app logic."
             },
             id: "skill-create-referenced-1"
           }
         ]}
      end)

      refute Repo.get_by(Console.Schema.WorkbenchSkill, %{name: skill_name})

      assert %{
               status: :successful,
               result: %{output: "Created new workbench skill" <> _}
             } =
               Skill.run(
                 activity,
                 skill_job,
                 Environment.new(skill_job, [], [])
               )

      assert %Console.Schema.WorkbenchSkill{
               name: ^skill_name,
               workbench_id: wb_id
             } =
               Repo.get_by!(Console.Schema.WorkbenchSkill, name: skill_name)

      assert wb_id == workbench.id
      assert referenced_job.workbench_id == wb_id
    end
  end
end
