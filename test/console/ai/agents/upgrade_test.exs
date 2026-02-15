defmodule Console.AI.Agents.UpgradeTest do
  use Console.DataCase, async: false
  alias Console.AI.Agents.Upgrade
  alias Console.AI.{Provider, VectorStore}
  alias Console.AI.Tool
  import ElasticsearchUtils
  use Mimic

  setup :set_mimic_global

  describe "exec/1" do
    test "it can execute an upgrade" do
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
      upgrade = insert(:cluster_upgrade, user: admin_user())
      step = insert(:cluster_upgrade_step, upgrade: upgrade, type: :addon, prompt: "Upgrade the addon")
      insert(:agent_runtime, name: "upgrade", default: true)

      expect(Provider, :completion, fn _, _ -> {:ok, "Upgrade the addon", [
        %Tool{name: "__plrl__service_search", arguments: %{"query" => "error"}, id: "1"}
      ]} end)
      expect(VectorStore, :fetch, fn "error", _ ->
        {:ok, [
          %Console.AI.VectorStore.Response{
            type: :service,
            service_component: %Console.Schema.ServiceComponent.Mini{
              name: "cert-manager",
              kind: "Deployment",
              namespace: "cert-manager",
              group: "cert-manager",
              version: "v1",
              children: [],
            }
          }
        ]}
      end)
      expect(Provider, :completion, fn _, _ -> {:ok, "Upgrade the addon", [
        %Tool{name: "__plrl__coding_agent", arguments: %{"prompt" => "some prompt", "repository" => "https://github.com/plural/test.git"}, id: "2"}
      ]} end)

      me = self()
      spawn(fn ->
        Process.send_after(me, :poll, :timer.seconds(1))
        {:ok, result} = Upgrade.exec(refetch(upgrade))
        send(me, {:result, result})
      end)

      assert_receive :poll, :timer.seconds(2)

      step = refetch(step)
      assert step.agent_run_id

      run = Repo.get(Console.Schema.AgentRun, step.agent_run_id)
      insert(:pull_request, agent_run: run)

      assert_receive {:result, result}, :timer.seconds(10)

      assert result.status == :completed

      %{steps: [step]} = Repo.preload(refetch(upgrade), steps: :agent_run)
      assert step.status == :completed
      assert step.agent_run_id == run.id
      assert step.agent_run.prompt == "some prompt"
    end
  end
end
