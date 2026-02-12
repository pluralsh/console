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
      insert(:cluster_upgrade_step, upgrade: upgrade, type: :addon, prompt: "Upgrade the addon")
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

      {:ok, result} = Upgrade.exec(refetch(upgrade))

      assert result.status == :completed

      %{steps: [step]} = Repo.preload(refetch(result), steps: :agent_run)
      assert step.status == :completed
      assert step.agent_run.prompt == "some prompt"
    end
  end
end
