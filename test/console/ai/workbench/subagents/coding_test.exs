defmodule Console.AI.Workbench.Subagents.CodingTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Workbench.{Subagents, Environment}
  alias Console.AI.{Provider, Tool}
  import ElasticsearchUtils

  setup :set_mimic_global

  describe "new/1" do
    test "returns success after polling a run" do
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

      expect(Provider, :completion, fn _, _ ->
        {:ok, "complete", [
          %Tool{name: "subagent_result", arguments: %{"output" => "some workbench result"}}
        ]}
      end)

      runtime = insert(:agent_runtime)
      workbench = insert(:workbench,
        agent_runtime: runtime,
        configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}}
      )
      job = insert(:workbench_job, workbench: workbench, user: admin_user())
      activity = insert(:workbench_job_activity, workbench_job: job, type: :infrastructure)

      me = self()
      spawn_link(fn ->
        Console.AI.Tool.context(user: job.user, runtime: workbench.agent_runtime)
        Process.send_after(me, :poll, :timer.seconds(1))
        result = Subagents.Coding.run(activity, job, Environment.new(job, [], []))
        send(me, {:result, result})
      end)

      assert_receive :poll, :timer.seconds(2)

      wait_for_agent_runs(activity.id, 1)
      [run] = agent_runs(activity.id)
      insert(:pull_request, agent_run: run)
      update_record(run, %{status: :successful})

      assert_receive {:result, result}, :timer.seconds(20)

      assert result[:status] == :successful
      assert result[:result][:output] == "some workbench result"
    end

    test "waits for every coding run from one tool batch" do
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
        {:ok, "delegate both changes", [
          %Tool{name: "workbench_coding_agent", arguments: %{
            "mode" => "write",
            "repository" => "https://github.com/pluralsh/console.git",
            "prompt" => "update the API"
          }, id: "1"},
          %Tool{name: "workbench_coding_agent", arguments: %{
            "mode" => "write",
            "repository" => "https://github.com/pluralsh/console.git",
            "prompt" => "update the UI"
          }, id: "2"}
        ]}
      end)

      me = self()

      expect(Provider, :completion, fn messages, _ ->
        tool_messages = Enum.filter(messages, &match?({:tool, _, _}, &1))
        send(me, {:agent_results, tool_messages})

        {:ok, "complete", [
          %Tool{name: "subagent_result", arguments: %{"output" => "both changes completed"}}
        ]}
      end)

      runtime = insert(:agent_runtime)
      workbench = insert(:workbench,
        agent_runtime: runtime,
        configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}}
      )
      job = insert(:workbench_job, workbench: workbench, user: admin_user())
      activity = insert(:workbench_job_activity, workbench_job: job, type: :infrastructure)

      spawn_link(fn ->
        Console.AI.Tool.context(user: job.user, runtime: workbench.agent_runtime)
        Process.send_after(me, :poll, :timer.seconds(1))
        result = Subagents.Coding.run(activity, job, Environment.new(job, [], []))
        send(me, {:result, result})
      end)

      assert_receive :poll, :timer.seconds(2)

      wait_for_agent_runs(activity.id, 2)
      runs = agent_runs(activity.id)

      Enum.each(runs, fn run ->
        insert(:pull_request, agent_run: run)
        update_record(run, %{status: :successful})
      end)

      assert_receive {:agent_results, tool_messages}, :timer.seconds(20)
      assert Enum.map(tool_messages, &elem(&1, 2).call_id) |> Enum.sort() == ["1", "2"]

      assert_receive {:result, result}, :timer.seconds(2)
      assert result[:status] == :successful
      assert result[:result][:output] == "both changes completed"
    end
  end

  defp wait_for_agent_runs(activity_id, count, attempts \\ 20)
  defp wait_for_agent_runs(_, _, 0), do: flunk("timed out waiting for coding agent runs")
  defp wait_for_agent_runs(activity_id, count, attempts) do
    Console.Schema.WorkbenchJobActivityAgentRun.for_activity(activity_id)
    |> Repo.aggregate(:count, :id)
    |> case do
      ^count -> :ok
      _ ->
        Process.sleep(50)
        wait_for_agent_runs(activity_id, count, attempts - 1)
    end
  end

  defp agent_runs(activity_id) do
    Repo.get!(Console.Schema.WorkbenchJobActivity, activity_id)
    |> Repo.preload(:agent_runs)
    |> Map.fetch!(:agent_runs)
  end
end
