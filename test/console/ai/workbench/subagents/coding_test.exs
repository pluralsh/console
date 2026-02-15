defmodule Console.AI.Workbench.Subagents.CodingTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Workbench.{Subagents, Environment}
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
        {:ok, "analyze", [
          %Tool{name: "workbench_coding_agent", arguments: %{
            "mode" => "write",
            "repository" => "https://github.com/pluralsh/console.git",
            "prompt" => "analyze the codebase"
          }, id: "1"}
        ]}
      end)

      runtime = insert(:agent_runtime)
      workbench = insert(:workbench, agent_runtime: runtime, configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}})
      job = insert(:workbench_job, workbench: workbench, user: admin_user())
      activity = insert(:workbench_job_activity, workbench_job: job, type: :infrastructure)

      me = self()
      spawn(fn ->
        Console.AI.Tool.context(user: job.user, runtime: workbench.agent_runtime)
        Process.send_after(me, :poll, :timer.seconds(1))
        result = Subagents.Coding.run(activity, job, Environment.new(job, [], []))
        send(me, {:result, result})
      end)

      assert_receive :poll, :timer.seconds(2)

      activity = refetch(activity)
      assert activity.agent_run_id

      run = Repo.get(Console.Schema.AgentRun, activity.agent_run_id)
      insert(:pull_request, agent_run: run)

      assert_receive {:result, result}, :timer.seconds(10)

      assert result[:status] == :successful
      assert is_binary(result[:result][:output])
    end
  end
end
