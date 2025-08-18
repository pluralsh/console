defmodule Console.Deployments.Sentinel.RunnerTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Deployments.Sentinel.Runner

  setup :set_mimic_global

  describe "#start/1" do
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

      expect(Console.AI.OpenAI, :tool_call, fn _, _, _ ->
        {:ok, [%Console.AI.Tool{name: "sentinel_check", arguments: %{passing: true, reason: "lgtm"}}]}
      end)

      run = insert(:sentinel_run, sentinel: sentinel)

      {:ok, pid} = Runner.start(refetch(run))

      case Console.await(pid, :timer.seconds(30)) do
        :ok -> :ok
        :timeout -> flunk("timeout waiting for sentinel run to finish")
      end

      run = refetch(run)

      assert run.status == :success
      [status] = run.results

      assert status.status == :success
      assert status.reason == "lgtm"
    end
  end
end
