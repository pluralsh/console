defmodule Console.Deployments.Sentinel.RunnerTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Deployments.Sentinel.Runner
  alias Console.Deployments.Sentinels
  alias Console.Schema.SentinelRunJob

  setup :set_mimic_global

  describe "#start/1" do
    @tag :skip
    test "starts a sentinel run" do
      deployment_settings(
        logging: %{
          enabled: true,
          driver: :elastic,
          elastic: es_settings(),
        },
        ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}}
      )

      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      sentinel = insert(:sentinel,
        repository: git,
        git: %{ref: "main", folder: "charts/deployment-operator"},
        checks: [
          %{
            type: :log,
            name: "log",
            rule_file: "values.yaml",
            configuration: %{
              log: %{
                query: "error",
                duration: "20s",
                namespaces: ["kube-system"]
              }
            }
          }
        ]
      )

      expect(Console.Logs.Provider, :query, fn _ ->
        {:ok, [%Console.Logs.Line{
          timestamp: DateTime.utc_now(),
          log: "error",
        }]}
      end)

      expect(Console.AI.OpenAI, :tool_call, fn _, _, _, _ ->
        {:ok, [%Console.AI.Tool{name: "sentinel_check", arguments: %{passing: true, reason: "lgtm"}}]}
      end)

      run = insert(:sentinel_run, sentinel: sentinel, checks: Console.mapify(sentinel.checks))

      {:ok, pid} = Runner.start(refetch(run), self())

      case Console.await(pid, :timer.seconds(30)) do
        :ok -> :ok
        :timeout -> flunk("timeout waiting for sentinel run to finish")
      end

      run = refetch(run)

      assert run.status == :success
      [status] = run.results

      assert status.status == :success
      assert status.reason == "lgtm"

      assert refetch(sentinel).status == :success

      assert_receive {:event, %Console.PubSub.SentinelRunUpdated{item: event_run}}
      assert event_run.id == run.id
    end

    test "it can handle integration test sentinels appropriately" do
      sentinel = insert(:sentinel,
        checks: [
          %{
            type: :integration_test,
            name: "integration_test",
            tags: %{"tier" => "dev"},
            configuration: %{
              integration_test: %{
                namespace: "kube-system",
                command: "echo 'hello'",
              }
            }
          }
        ]
      )

      insert_list(2, :cluster, tags: [%{name: "tier", value: "dev"}])
      run = insert(:sentinel_run, sentinel: sentinel, checks: Console.mapify(sentinel.checks))

      {:ok, pid} = Runner.start(refetch(run))

      %Runner.State{checks: checks} = :sys.get_state(pid)
      [job_pid] = Map.keys(checks)
      :sys.get_state(job_pid)

      SentinelRunJob.for_sentinel_run(run.id)
      |> Console.Repo.all()
      |> Console.Repo.preload(:cluster)
      |> Enum.each(fn job ->
        assert {:ok, _} = Sentinels.update_sentinel_job(%{status: :success}, job.id, job.cluster)
        assert_receive {:event, %Console.PubSub.SentinelRunJobUpdated{} = event}
        Console.PubSub.Recurse.process(event)
      end)

      case Console.await(pid, :timer.seconds(5)) do
        :ok -> :ok
        :timeout -> flunk("timeout waiting for sentinel run to finish")
      end

      run = refetch(run)
      assert run.status == :success
      [status] = run.results

      assert status.status == :success
      assert status.job_count        == 2
      assert status.successful_count == 2
      assert status.failed_count     == 0
    end
  end
end
